import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherDashboardRepository } from '../src/modules/teacher-dashboard/teacher-dashboard.repository.js';
import { TeacherClassesService } from '../src/modules/teacher-classes/teacher-classes.service.js';
import type { TeacherDashboardRecord } from '../src/modules/teacher-dashboard/teacher-dashboard.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const assignedClassId = randomUUID();
const unassignedClassId = randomUUID();
const firstStudentId = randomUUID();
const secondStudentId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

function record(includeAssignedClass = true): TeacherDashboardRecord {
  const now = Date.now();
  return {
    teacher: { id: teacherId, displayName: 'Neha Kapoor' },
    school: { id: schoolId, name: 'Helixed Demo School' },
    classes: includeAssignedClass
      ? [
          {
            id: assignedClassId,
            name: 'Class 12',
            studentIds: [firstStudentId, secondStudentId],
            openTaskCount: 2,
            sessions: [
              {
                id: randomUUID(),
                subjectName: 'Mathematics',
                startsAt: new Date(now + 3_600_000),
                endsAt: new Date(now + 7_200_000),
                state: 'SCHEDULED',
                records: [],
              },
              {
                id: randomUUID(),
                subjectName: 'Mathematics',
                startsAt: new Date(now - 7_200_000),
                endsAt: new Date(now - 3_600_000),
                state: 'COMPLETED',
                records: [{ studentId: firstStudentId, state: 'PRESENT' }],
              },
            ],
          },
        ]
      : [],
  };
}

class ClassesRepository implements TeacherDashboardRepository {
  assignment = true;
  record = record();
  queries: { teacherId: string; schoolId: string }[] = [];

  async findTeacherRoleAssignment(userId: string) {
    return this.assignment && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async dashboard(queriedTeacherId: string, queriedSchoolId: string) {
    this.queries.push({ teacherId: queriedTeacherId, schoolId: queriedSchoolId });
    return this.record;
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_classes:read'],
  verifiedMembership = true,
  assigned = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  verifiedMembership?: boolean;
  assigned?: boolean;
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
  if (assigned) authorization.teacherClasses.add(`${teacherId}:${schoolId}:${assignedClassId}`);
  const repository = new ClassesRepository();
  repository.record = record(assigned);
  const app = createApp({
    authService: auth,
    teacherClassesService: new TeacherClassesService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository, authorization };
}

describe('teacher classes API', () => {
  it('denies unauthenticated requests', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/classes')).status).toBe(401);
    expect(
      (await request(createApp()).get(`/api/v1/teacher/classes/${assignedClassId}`)).status,
    ).toBe(401);
  });

  it('requires an active Teacher role, verified school membership, and explicit permission', async () => {
    for (const options of [
      { role: 'student' as const },
      { verifiedMembership: false },
      { permissions: [] as string[] },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/classes')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('returns only assigned class summaries with scoped active student counts', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(repository.queries).toEqual([{ teacherId, schoolId }]);
    expect(response.body.classes).toEqual([
      expect.objectContaining({
        id: assignedClassId,
        name: 'Class 12',
        subjects: ['Mathematics'],
        studentCount: 2,
        openTaskCount: 2,
        attendanceRecordingPending: 1,
      }),
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      new RegExp(
        `${firstStudentId}|${secondStudentId}|${unassignedClassId}|password|token|AI|parent`,
        'i',
      ),
    );
  });

  it('searches only the assigned projection and rejects forged request ownership fields', async () => {
    const { app, accessToken } = await setup();
    const match = await request(app)
      .get('/api/v1/teacher/classes?search=mathematics')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(match.status).toBe(200);
    expect(match.body.classes).toHaveLength(1);

    const noMatch = await request(app)
      .get('/api/v1/teacher/classes?search=unassigned')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(noMatch.status).toBe(200);
    expect(noMatch.body.classes).toEqual([]);

    expect(
      (
        await request(app)
          .get(`/api/v1/teacher/classes?teacherId=${randomUUID()}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
  });

  it('returns an authorized true-empty result when the Teacher has no assignments', async () => {
    const { app, accessToken } = await setup({ assigned: false });
    const response = await request(app)
      .get('/api/v1/teacher/classes')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.classes).toEqual([]);
  });

  it('returns a narrow canonical detail only for the actively assigned class', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/classes/${assignedClassId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: assignedClassId,
        name: 'Class 12',
        studentCount: 2,
        openTaskCount: 2,
        school: { id: schoolId, name: 'Helixed Demo School' },
        recentSessions: expect.arrayContaining([
          expect.objectContaining({
            subjectName: 'Mathematics',
            knownAttendanceCount: 1,
            missingAttendanceCount: 1,
            absentAttendanceCount: 0,
          }),
        ]),
      }),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /Aarav|Mira|password|token|parent|profile|community|ai conversation/i,
    );
  });

  it('denies malformed, unassigned, and inactive-assignment class detail requests', async () => {
    const { app, accessToken, authorization } = await setup();
    const authenticated = (classId: string) =>
      request(app)
        .get(`/api/v1/teacher/classes/${classId}`)
        .set('Authorization', `Bearer ${accessToken}`);

    expect((await authenticated('not-a-uuid')).status).toBe(400);
    expect((await authenticated(unassignedClassId)).status).toBe(403);
    expect((await authenticated(randomUUID())).status).toBe(403);
    authorization.teacherClasses.clear();
    expect((await authenticated(assignedClassId)).status).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/v1/teacher/classes/${assignedClassId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
  });

  it('requires Teacher role, verified membership, and teacher_classes permission for detail access', async () => {
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { verifiedMembership: false },
      { permissions: [] as string[] },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get(`/api/v1/teacher/classes/${assignedClassId}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });
});
