import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherDashboardRepository } from '../src/modules/teacher-dashboard/teacher-dashboard.repository.js';
import { TeacherDashboardService } from '../src/modules/teacher-dashboard/teacher-dashboard.service.js';
import type { TeacherDashboardRecord } from '../src/modules/teacher-dashboard/teacher-dashboard.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const studentId = randomUUID();
const secondStudentId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

function dashboardRecord(classes = true): TeacherDashboardRecord {
  const now = Date.now();
  return {
    teacher: { id: teacherId, displayName: 'Neha Kapoor' },
    school: { id: schoolId, name: 'Helixed Demo School' },
    classes: classes
      ? [
          {
            id: classId,
            name: 'Class 12',
            studentIds: [studentId, secondStudentId],
            openTaskCount: 3,
            sessions: [
              {
                id: randomUUID(),
                subjectName: 'Mathematics',
                startsAt: new Date(now - 3_600_000),
                endsAt: new Date(now - 1_800_000),
                state: 'COMPLETED',
                records: [{ studentId, state: 'ABSENT' }],
              },
              {
                id: randomUUID(),
                subjectName: 'Mathematics',
                startsAt: new Date(now + 86_400_000),
                endsAt: new Date(now + 88_200_000),
                state: 'SCHEDULED',
                records: [],
              },
            ],
          },
        ]
      : [],
  };
}

class DashboardRepository implements TeacherDashboardRepository {
  roleAssignment = true;
  record = dashboardRecord();
  queries: { teacherId: string; schoolId: string }[] = [];

  async findTeacherRoleAssignment(userId: string) {
    return this.roleAssignment && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async dashboard(queriedTeacherId: string, queriedSchoolId: string) {
    this.queries.push({ teacherId: queriedTeacherId, schoolId: queriedSchoolId });
    return this.record;
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_dashboard:read'],
  verifiedMembership = true,
  classes = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  verifiedMembership?: boolean;
  classes?: boolean;
} = {}) {
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: teacherId,
        loginIdentifier: 'teacher-demo',
        displayName: 'Neha Kapoor',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authorization = new InMemoryAuthorizationRepository();
  authorization.assignments = [
    {
      id: 'teacher-role',
      userId: teacherId,
      role,
      scope: 'school',
      schoolId,
      academyId: null,
      permissions,
    },
  ];
  if (verifiedMembership) authorization.schoolMembers.add(`${teacherId}:${schoolId}`);
  const repository = new DashboardRepository();
  repository.record = dashboardRecord(classes);
  const app = createApp({
    authService: auth,
    teacherDashboardService: new TeacherDashboardService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository };
}

describe('teacher dashboard API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/teacher')).status).toBe(401);
  });

  it('requires Teacher role, verified school membership, and explicit permission', async () => {
    for (const options of [
      { role: 'student' as const },
      { verifiedMembership: false },
      { permissions: [] as string[] },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (await request(app).get('/api/v1/teacher').set('Authorization', `Bearer ${accessToken}`))
          .status,
      ).toBe(403);
    }
  });

  it('derives a narrow dashboard from only the authenticated Teacher school scope', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(repository.queries).toEqual([{ teacherId, schoolId }]);
    expect(response.body.teacher.displayName).toBe('Neha Kapoor');
    expect(response.body.summary).toEqual({
      assignedClasses: 1,
      authorizedStudents: 2,
      openStudentTasks: 3,
      attendanceSessionsPending: 1,
    });
    expect(response.body.classes[0]).toEqual({
      id: classId,
      name: 'Class 12',
      studentCount: 2,
      sessionSubjects: ['Mathematics'],
      openTaskCount: 3,
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /studentIds|password|token|AI conversation|Community|parent|sibling|profile/i,
    );
  });

  it('preserves missing attendance separately from absence', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.body.recentSessions[0].attendance).toEqual({
      expectedStudents: 2,
      knownRecords: 1,
      missingRecords: 1,
      absentRecords: 1,
    });
  });

  it('renders a true no-assigned-class projection and rejects supplied teacher IDs', async () => {
    const { app, accessToken } = await setup({ classes: false });
    const response = await request(app)
      .get('/api/v1/teacher')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.classes).toEqual([]);
    expect(response.body.summary.assignedClasses).toBe(0);
    expect(
      (
        await request(app)
          .get(`/api/v1/teacher?teacherId=${randomUUID()}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
  });
});
