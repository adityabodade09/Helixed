import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherStudentsRepository } from '../src/modules/teacher-students/teacher-students.repository.js';
import { TeacherStudentsService } from '../src/modules/teacher-students/teacher-students.service.js';
import type {
  TeacherStudentDetailRecord,
  TeacherStudentsRecord,
} from '../src/modules/teacher-students/teacher-students.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
const unassignedClassId = randomUUID();
const studentId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

function roster(students = true): TeacherStudentsRecord {
  return {
    teacher: { id: teacherId, displayName: 'Neha Kapoor' },
    school: { id: schoolId, name: 'Helixed Demo School' },
    students: students
      ? [
          {
            id: studentId,
            displayName: 'Aarav Sharma',
            classes: [{ id: classId, name: 'Class 12', subjects: ['Mathematics'] }],
          },
        ]
      : [],
  };
}

function studentDetail(): TeacherStudentDetailRecord {
  return {
    teacher: { id: teacherId, displayName: 'Neha Kapoor' },
    school: { id: schoolId, name: 'Helixed Demo School' },
    student: {
      id: studentId,
      displayName: 'Aarav Sharma',
      classes: [
        {
          id: classId,
          name: 'Class 12',
          sessions: [
            {
              id: randomUUID(),
              subjectName: 'Mathematics',
              startsAt: new Date('2026-09-08T08:00:00Z'),
              endsAt: new Date('2026-09-08T09:00:00Z'),
              records: [{ state: 'PRESENT' }],
            },
            {
              id: randomUUID(),
              subjectName: 'Mathematics',
              startsAt: new Date('2026-09-09T08:00:00Z'),
              endsAt: new Date('2026-09-09T09:00:00Z'),
              records: [],
            },
          ],
        },
      ],
    },
  };
}

class StudentsRepository implements TeacherStudentsRepository {
  assignment = true;
  record = roster();
  detailRecord = studentDetail();
  queries: { teacherId: string; schoolId: string; classId?: string }[] = [];
  detailQueries: { teacherId: string; studentId: string; schoolId: string }[] = [];

  async findTeacherRoleAssignment(userId: string) {
    return this.assignment && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async listStudents(
    queriedTeacherId: string,
    queriedSchoolId: string,
    _now: Date,
    queriedClassId?: string,
  ) {
    this.queries.push({
      teacherId: queriedTeacherId,
      schoolId: queriedSchoolId,
      classId: queriedClassId,
    });
    return this.record;
  }

  async findStudentDetail(
    queriedTeacherId: string,
    queriedStudentId: string,
    queriedSchoolId: string,
  ) {
    this.detailQueries.push({
      teacherId: queriedTeacherId,
      studentId: queriedStudentId,
      schoolId: queriedSchoolId,
    });
    return this.detailRecord;
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_students:read'],
  verifiedMembership = true,
  students = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  verifiedMembership?: boolean;
  students?: boolean;
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
  authorization.teacherClasses.add(`${teacherId}:${schoolId}:${classId}`);
  authorization.teacherStudents.add(`${teacherId}:${schoolId}:${studentId}:${classId}`);
  const repository = new StudentsRepository();
  repository.record = roster(students);
  const app = createApp({
    authService: auth,
    teacherStudentsService: new TeacherStudentsService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, authorization, repository };
}

describe('teacher students API', () => {
  it('denies unauthenticated requests', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/students')).status).toBe(401);
    expect((await request(createApp()).get(`/api/v1/teacher/students/${studentId}`)).status).toBe(
      401,
    );
  });

  it('requires the Teacher role, permission, and verified membership', async () => {
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: [] as string[] },
      { verifiedMembership: false },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/students')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('returns only a minimized teaching-context roster with canonical student and class identities', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/students')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(repository.queries).toEqual([{ teacherId, schoolId, classId: undefined }]);
    expect(response.body.students).toEqual([
      {
        id: studentId,
        displayName: 'Aarav Sharma',
        classes: [{ id: classId, name: 'Class 12', subjects: ['Mathematics'] }],
      },
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /loginIdentifier|password|token|ai|community|notes|profile|settings|parent|permission/i,
    );
  });

  it('limits search to the authorized roster and independently authorizes class filters', async () => {
    const { app, accessToken, repository } = await setup();
    const authorized = (path: string) =>
      request(app).get(path).set('Authorization', `Bearer ${accessToken}`);

    expect((await authorized('/api/v1/teacher/students?search=aarav')).body.students).toHaveLength(
      1,
    );
    expect((await authorized('/api/v1/teacher/students?search=unrelated')).body.students).toEqual(
      [],
    );
    expect((await authorized(`/api/v1/teacher/students?classId=${classId}`)).status).toBe(200);
    expect(repository.queries.at(-1)).toEqual({ teacherId, schoolId, classId });
    expect((await authorized(`/api/v1/teacher/students?classId=${unassignedClassId}`)).status).toBe(
      403,
    );
    expect((await authorized('/api/v1/teacher/students?classId=not-a-uuid')).status).toBe(400);
  });

  it('returns a successful empty result without a school-wide fallback and exposes no mutation route', async () => {
    const { app, accessToken } = await setup({ students: false });
    const headers = { Authorization: `Bearer ${accessToken}` };
    expect((await request(app).get('/api/v1/teacher/students').set(headers)).body.students).toEqual(
      [],
    );
    expect((await request(app).post('/api/v1/teacher/students').set(headers)).status).toBe(404);
  });

  it('returns a minimized detail only through the exact Teacher-to-student assignment path', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/students/${studentId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(repository.detailQueries).toEqual([{ teacherId, studentId, schoolId }]);
    expect(response.body.student).toEqual({ id: studentId, displayName: 'Aarav Sharma' });
    expect(response.body.classes).toEqual([
      { id: classId, name: 'Class 12', subjects: ['Mathematics'] },
    ]);
    expect(response.body.attendance.summary).toMatchObject({
      scheduledSessions: 2,
      knownSessions: 1,
      missingSessions: 1,
      present: 1,
      absent: 0,
      presentRate: 100,
    });
    expect(
      response.body.attendance.sessions.map(({ state }: { state: string | null }) => state),
    ).toEqual([null, 'PRESENT']);
    expect(response.body.tasks).toEqual({ attributionAvailable: false, items: [] });
    expect(Object.keys(response.body)).toEqual([
      'teacher',
      'school',
      'student',
      'classes',
      'attendance',
      'tasks',
    ]);
    expect(Object.keys(response.body.student)).toEqual(['id', 'displayName']);
    expect(JSON.stringify(response.body)).not.toMatch(
      /loginIdentifier|password|token|community|notes|doubts|profile|settings|opportunity|parent|family|sibling|permission|ranking|riskScore|intelligence/i,
    );
  });

  it('denies malformed and students outside the active mutual class scope', async () => {
    const { app, accessToken, authorization, repository } = await setup();
    const headers = { Authorization: `Bearer ${accessToken}` };
    expect(
      (await request(app).get('/api/v1/teacher/students/not-a-uuid').set(headers)).status,
    ).toBe(400);

    authorization.teacherStudents.clear();
    expect(
      (await request(app).get(`/api/v1/teacher/students/${studentId}`).set(headers)).status,
    ).toBe(403);
    expect(repository.detailQueries).toEqual([]);
  });

  it('applies detail role, permission, membership, and read-only boundaries', async () => {
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: [] as string[] },
      { verifiedMembership: false },
    ]) {
      const { app, accessToken } = await setup(options);
      const headers = { Authorization: `Bearer ${accessToken}` };
      expect(
        (await request(app).get(`/api/v1/teacher/students/${studentId}`).set(headers)).status,
      ).toBe(403);
    }

    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .post(`/api/v1/teacher/students/${studentId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
  });
});
