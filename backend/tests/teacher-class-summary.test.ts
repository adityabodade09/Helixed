import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherClassSummaryRepository } from '../src/modules/teacher-class-summary/teacher-class-summary.repository.js';
import { TeacherClassSummaryService } from '../src/modules/teacher-class-summary/teacher-class-summary.service.js';
import type { TeacherClassSummaryRecord } from '../src/modules/teacher-class-summary/teacher-class-summary.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
const unassignedClassId = randomUUID();
const firstStudentId = randomUUID();
const secondStudentId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class SummaryRepository implements TeacherClassSummaryRepository {
  role = true;
  sparse = false;
  historicalAttendanceVersions = 1;
  historicalMarkVersions = 1;
  studentTasks = 11;

  async findTeacherRoleAssignment(userId: string) {
    return this.role && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async findClassSummary(
    queriedTeacherId: string,
    queriedSchoolId: string,
    queriedClassId: string,
  ): Promise<TeacherClassSummaryRecord | null> {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      queriedClassId !== classId
    )
      return null;
    return this.sparse ? this.sparseRecord() : this.record();
  }

  private base() {
    return {
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      school: { id: schoolId, name: 'Helixed Demo School' },
    };
  }

  private sparseRecord(): TeacherClassSummaryRecord {
    return {
      ...this.base(),
      schoolClass: {
        id: classId,
        name: 'Class 12',
        studentIds: [],
        sessions: [],
        assignments: [],
        assessments: [],
      },
    };
  }

  private record(): TeacherClassSummaryRecord {
    return {
      ...this.base(),
      schoolClass: {
        id: classId,
        name: 'Class 12',
        studentIds: [firstStudentId, secondStudentId],
        sessions: [
          {
            id: randomUUID(),
            subjectName: 'Mathematics',
            startsAt: new Date('2026-10-01T08:00:00.000Z'),
            endsAt: new Date('2026-10-01T09:00:00.000Z'),
            state: 'COMPLETED',
            records: [
              { studentId: firstStudentId, state: 'PRESENT' },
              { studentId: secondStudentId, state: 'ABSENT' },
            ],
          },
          {
            id: randomUUID(),
            subjectName: 'Mathematics',
            startsAt: new Date('2026-10-02T08:00:00.000Z'),
            endsAt: new Date('2026-10-02T09:00:00.000Z'),
            state: 'COMPLETED',
            records: [{ studentId: firstStudentId, state: 'LATE' }],
          },
          {
            id: randomUUID(),
            subjectName: 'Mathematics',
            startsAt: new Date('2099-10-03T08:00:00.000Z'),
            endsAt: new Date('2099-10-03T09:00:00.000Z'),
            state: 'SCHEDULED',
            records: [],
          },
        ],
        assignments: [
          {
            id: randomUUID(),
            title: 'Canonical assignment',
            subjectName: 'Mathematics',
            dueAt: null,
            status: 'OPEN',
          },
          {
            id: randomUUID(),
            title: 'Draft worksheet',
            subjectName: 'Mathematics',
            dueAt: null,
            status: 'DRAFT',
          },
        ],
        assessments: [
          {
            id: randomUUID(),
            title: 'Unit Test',
            subjectName: 'Mathematics',
            maximumMarks: 100,
            assessedAt: new Date('2026-09-20T08:00:00.000Z'),
            marks: [
              { studentId: firstStudentId, value: 50 },
              { studentId: secondStudentId, value: 0 },
            ],
          },
          {
            id: randomUUID(),
            title: 'Quiz',
            subjectName: 'Mathematics',
            maximumMarks: 50,
            assessedAt: new Date('2026-09-25T08:00:00.000Z'),
            marks: [{ studentId: firstStudentId, value: 25 }],
          },
        ],
      },
    };
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_class_summary:read'],
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
  if (assignment) authorization.teacherClasses.add(`${teacherId}:${schoolId}:${classId}`);
  const repository = new SummaryRepository();
  repository.role = assignment;
  const app = createApp({
    authService: auth,
    teacherClassSummaryService: new TeacherClassSummaryService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository };
}

describe('teacher class summary API', () => {
  it('requires authentication, Teacher role, permission, membership, and active assignment', async () => {
    expect(
      (await request(createApp()).get(`/api/v1/teacher/class-summary?classId=${classId}`)).status,
    ).toBe(401);
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
            .get(`/api/v1/teacher/class-summary?classId=${classId}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('rejects malformed queries and safely denies an unassigned exact class', async () => {
    const { app, accessToken } = await setup();
    for (const query of ['', '?classId=bad', `?classId=${classId}&extra=true`]) {
      expect(
        (
          await request(app)
            .get(`/api/v1/teacher/class-summary${query}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(app)
          .get(`/api/v1/teacher/class-summary?classId=${unassignedClassId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(403);
  });

  it('derives attendance from current explicit records and preserves missing as unknown', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/class-summary?classId=${classId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.class).toEqual({ id: classId, name: 'Class 12', studentCount: 2 });
    expect(response.body.attendance).toEqual({
      completedSessions: 2,
      eligibleRecords: 4,
      knownRecords: 3,
      missingRecords: 1,
      present: 1,
      absent: 1,
      late: 1,
      partial: 0,
      presentRate: 33,
    });
    expect(repository.historicalAttendanceVersions).toBe(1);
  });

  it('uses canonical assignments rather than StudentTask or fabricated submission metrics', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/class-summary?classId=${classId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.body.assignments.total).toBe(2);
    expect(response.body.assignments.active).toBe(1);
    expect(response.body.assignments.items.map(({ title }: { title: string }) => title)).toEqual([
      'Canonical assignment',
      'Draft worksheet',
    ]);
    expect(repository.studentTasks).toBe(11);
    expect(JSON.stringify(response.body.assignments)).not.toMatch(/submission|completion/i);
  });

  it('normalizes current recorded marks, includes explicit zero, and excludes missing marks', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/class-summary?classId=${classId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.body.assessments).toMatchObject({
      total: 2,
      recordedMarks: 3,
      missingMarks: 1,
      normalizedAverage: 33,
    });
    expect(response.body.assessments.items[0]).toMatchObject({
      maximumMarks: 100,
      recordedCount: 2,
      missingCount: 0,
      normalizedAverage: 25,
    });
    expect(response.body.assessments.items[1]).toMatchObject({
      maximumMarks: 50,
      recordedCount: 1,
      missingCount: 1,
      normalizedAverage: 50,
    });
    expect(repository.historicalMarkVersions).toBe(1);
  });

  it('returns explicit unavailable aggregates for sparse canonical data', async () => {
    const { app, accessToken, repository } = await setup();
    repository.sparse = true;
    const response = await request(app)
      .get(`/api/v1/teacher/class-summary?classId=${classId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.class.studentCount).toBe(0);
    expect(response.body.attendance.presentRate).toBeNull();
    expect(response.body.assessments.normalizedAverage).toBeNull();
    expect(response.body.nextSession).toBeNull();
  });

  it('returns a minimized read-only DTO without private or ranking fields', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/class-summary?classId=${classId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(JSON.stringify(response.body)).not.toMatch(
      /"studentId"|"students"|"roster"|"rank"|"leaderboard"|"potential"|"prediction"|"intelligence"|"parent"|"family"|"password"|"token"|"community"|"profile"|"permission"/i,
    );
    for (const method of ['post', 'patch', 'put', 'delete'] as const) {
      const agent = request(app);
      expect(
        (
          await agent[method]('/api/v1/teacher/class-summary').set(
            'Authorization',
            `Bearer ${accessToken}`,
          )
        ).status,
      ).toBe(404);
    }
  });
});
