import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherDevelopmentRepository } from '../src/modules/teacher-development/teacher-development.repository.js';
import { TeacherDevelopmentService } from '../src/modules/teacher-development/teacher-development.service.js';
import type {
  TeacherDevelopmentEvidenceRecord,
  TeacherDevelopmentScopeRecord,
} from '../src/modules/teacher-development/teacher-development.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
const unassignedClassId = randomUUID();
const studentId = randomUUID();
const unrelatedStudentId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class DevelopmentRepository implements TeacherDevelopmentRepository {
  role = true;
  sparse = false;
  aiQueries = 0;
  activityQueries = 0;
  studentTasks = 9;
  supersededMarks = 1;
  supersededAttendance = 1;

  async findTeacherRoleAssignment(userId: string) {
    return this.role && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async findScope(): Promise<TeacherDevelopmentScopeRecord> {
    return {
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      school: { id: schoolId, name: 'Helixed Demo School' },
      classes: [
        {
          id: classId,
          name: 'Class 12',
          students: [{ id: studentId, displayName: 'Aarav Sharma' }],
        },
      ],
    };
  }

  async findEvidence(
    queriedTeacherId: string,
    queriedSchoolId: string,
    queriedClassId: string,
    queriedStudentId: string,
  ): Promise<TeacherDevelopmentEvidenceRecord | null> {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      queriedClassId !== classId ||
      queriedStudentId !== studentId
    )
      return null;
    const base = {
      schoolClass: { id: classId, name: 'Class 12' },
      student: { id: studentId, displayName: 'Aarav Sharma' },
    };
    if (this.sparse)
      return {
        ...base,
        attendanceSessions: [],
        assignments: [],
        assessments: [],
      };
    return {
      ...base,
      attendanceSessions: [
        this.session('PRESENT'),
        this.session('ABSENT'),
        this.session('LATE'),
        this.session(null),
      ],
      assignments: [
        {
          id: randomUUID(),
          title: 'Canonical class assignment',
          subjectName: 'Mathematics',
          dueAt: null,
          status: 'OPEN',
        },
      ],
      assessments: [
        this.assessment('Recorded zero', 100, 0),
        this.assessment('Scaled result', 50, 25),
        this.assessment('Missing result', 40, null),
      ],
    };
  }

  private session(state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null) {
    return {
      id: randomUUID(),
      subjectName: 'Mathematics',
      startsAt: new Date('2026-09-01T08:00:00Z'),
      state,
    };
  }

  private assessment(title: string, maximumMarks: number, value: number | null) {
    return {
      id: randomUUID(),
      title,
      subjectName: 'Mathematics',
      maximumMarks,
      assessedAt: new Date('2026-09-01T08:00:00Z'),
      mark: value === null ? null : { value },
    };
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_development:read'],
  membership = true,
  assignment = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  membership?: boolean;
  assignment?: boolean;
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
  if (membership) authorization.schoolMembers.add(`${teacherId}:${schoolId}`);
  if (assignment) {
    authorization.teacherClasses.add(`${teacherId}:${schoolId}:${classId}`);
    authorization.teacherStudents.add(`${teacherId}:${schoolId}:${studentId}:${classId}`);
  }
  const repository = new DevelopmentRepository();
  repository.role = assignment;
  const app = createApp({
    authService: auth,
    teacherDevelopmentService: new TeacherDevelopmentService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository };
}

describe('teacher development API', () => {
  it('requires authentication, Teacher role, permission, membership, and active assignment', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/development')).status).toBe(401);
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: [] },
      { membership: false },
      { assignment: false },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/development')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('strictly validates filters and denies unassigned classes and unauthorized students', async () => {
    const { app, accessToken } = await setup();
    for (const query of [
      '?classId=bad',
      `?studentId=${studentId}`,
      `?classId=${classId}&extra=true`,
    ]) {
      expect(
        (
          await request(app)
            .get(`/api/v1/teacher/development${query}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(400);
    }
    for (const query of [
      `?classId=${unassignedClassId}`,
      `?classId=${classId}&studentId=${unrelatedStudentId}`,
    ]) {
      expect(
        (
          await request(app)
            .get(`/api/v1/teacher/development${query}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('returns only assigned class/student options and factual canonical evidence', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/development?classId=${classId}&studentId=${studentId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.classes).toEqual([
      {
        id: classId,
        name: 'Class 12',
        students: [{ id: studentId, displayName: 'Aarav Sharma' }],
      },
    ]);
    expect(response.body.selection).toEqual({
      class: { id: classId, name: 'Class 12' },
      student: { id: studentId, displayName: 'Aarav Sharma' },
    });
    expect(response.body.classAssignments).toMatchObject({
      attribution: 'CLASS_CONTEXT_ONLY',
      items: [{ title: 'Canonical class assignment' }],
    });
  });

  it('preserves missing attendance and current explicit state semantics', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/development')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.body.attendance).toMatchObject({
      known: 3,
      missing: 1,
      present: 1,
      absent: 1,
      late: 1,
      partial: 0,
      presentRate: 33,
    });
    expect(response.body.attendance.sessions.at(-1).state).toBeNull();
    expect(repository.supersededAttendance).toBe(1);
  });

  it('uses current normalized Marks, includes explicit zero, and excludes missing evidence', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/development')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.body.assessments).toMatchObject({
      recorded: 2,
      missing: 1,
      normalizedAverage: 25,
    });
    expect(
      response.body.assessments.items.map(({ mark }: { mark: number | null }) => mark),
    ).toEqual([0, 25, null]);
    expect(repository.supersededMarks).toBe(1);
    expect(repository.studentTasks).toBe(9);
  });

  it('returns explicit sparse evidence without negative inference', async () => {
    const { app, accessToken, repository } = await setup();
    repository.sparse = true;
    const response = await request(app)
      .get('/api/v1/teacher/development')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.attendance.presentRate).toBeNull();
    expect(response.body.assessments.normalizedAverage).toBeNull();
    expect(response.body.assessments.items).toEqual([]);
    expect(response.body.activityEvidence).toEqual({ available: false });
  });

  it('does not query private/AI/activity domains or expose profiling and mutation routes', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/development')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(repository.aiQueries).toBe(0);
    expect(repository.activityQueries).toBe(0);
    expect(JSON.stringify(response.body)).not.toMatch(
      /aiConversation|community|note|doubt|parent|family|password|token|rank|leaderboard|intelligence|potentialScore|riskScore|prediction|recommendation/i,
    );
    for (const method of ['post', 'patch', 'put', 'delete'] as const) {
      const agent = request(app);
      expect(
        (
          await agent[method]('/api/v1/teacher/development').set(
            'Authorization',
            `Bearer ${accessToken}`,
          )
        ).status,
      ).toBe(404);
    }
  });
});
