import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type {
  MarksFilters,
  TeacherMarksRepository,
} from '../src/modules/teacher-marks/teacher-marks.repository.js';
import { TeacherMarksService } from '../src/modules/teacher-marks/teacher-marks.service.js';
import type {
  MarkWrite,
  MarkWriteResult,
  TeacherMarkAssessmentRecord,
  TeacherMarksRecord,
} from '../src/modules/teacher-marks/teacher-marks.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
const unassignedClassId = randomUUID();
const assessmentId = randomUUID();
const unrelatedAssessmentId = randomUUID();
const firstStudentId = randomUUID();
const secondStudentId = randomUUID();
const outsideStudentId = randomUUID();
const originalMarkId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class MarksRepository implements TeacherMarksRepository {
  role = true;
  queries: MarksFilters[] = [];
  current = new Map<string, { id: string; value: number; recordedAt: Date }>([
    [firstStudentId, { id: originalMarkId, value: 84, recordedAt: new Date('2026-09-06') }],
  ]);
  history: { id: string; studentId: string; value: number; supersededAt: Date | null }[] = [
    { id: originalMarkId, studentId: firstStudentId, value: 84, supersededAt: null as Date | null },
  ];
  recordedBy: string[] = [];
  adjacentWrites = { assignments: 0, studentTasks: 0, submissions: 0, assessments: 0, feedback: 0 };

  async findTeacherRoleAssignment(userId: string) {
    return this.role && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async list(
    queriedTeacherId: string,
    queriedSchoolId: string,
    _now: Date,
    filters: MarksFilters,
  ): Promise<TeacherMarksRecord | null> {
    if (queriedTeacherId !== teacherId || queriedSchoolId !== schoolId) return null;
    this.queries.push(filters);
    return {
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      school: { id: schoolId, name: 'Helixed Demo School' },
      classes: [
        {
          id: classId,
          name: 'Class 12',
          studentCount: 2,
          assessments:
            filters.search === 'missing'
              ? []
              : [
                  {
                    id: assessmentId,
                    title: 'Unit Test 1',
                    subjectName: 'Mathematics',
                    maximumMarks: 100,
                    assessedAt: new Date('2026-09-05'),
                    recordedCount: this.current.size,
                  },
                ],
        },
      ],
    };
  }

  async findAssessment(
    queriedTeacherId: string,
    queriedSchoolId: string,
    queriedAssessmentId: string,
  ): Promise<TeacherMarkAssessmentRecord | null> {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      queriedAssessmentId !== assessmentId
    )
      return null;
    return {
      id: assessmentId,
      title: 'Unit Test 1',
      subjectName: 'Mathematics',
      maximumMarks: 100,
      assessedAt: new Date('2026-09-05'),
      schoolClass: { id: classId, name: 'Class 12' },
      students: [firstStudentId, secondStudentId].map((id, index) => ({
        id,
        displayName: index === 0 ? 'Aarav Sharma' : 'Priya Demo',
        mark: this.current.get(id) ?? null,
      })),
    };
  }

  async record(
    queriedTeacherId: string,
    queriedSchoolId: string,
    queriedAssessmentId: string,
    writes: MarkWrite[],
    now: Date,
  ): Promise<MarkWriteResult> {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      queriedAssessmentId !== assessmentId ||
      writes.some(
        ({ studentId }) => !new Set<string>([firstStudentId, secondStudentId]).has(studentId),
      )
    )
      return 'NOT_AVAILABLE';
    if (writes.some(({ value }) => value > 100)) return 'OUT_OF_RANGE';
    if (
      writes.some(
        ({ studentId, expectedMarkId }) =>
          (this.current.get(studentId)?.id ?? null) !== expectedMarkId,
      )
    )
      return 'CONFLICT';
    for (const write of writes) {
      const current = this.current.get(write.studentId);
      if (current?.value === write.value) continue;
      if (current) this.history.find(({ id }) => id === current.id)!.supersededAt = now;
      const created = { id: randomUUID(), value: write.value, recordedAt: now };
      this.current.set(write.studentId, created);
      this.history.push({
        id: created.id,
        studentId: write.studentId,
        value: write.value,
        supersededAt: null,
      });
      this.recordedBy.push(teacherId);
    }
    return 'SUCCESS';
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_marks:read', 'teacher_marks:update'],
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
  const repository = new MarksRepository();
  repository.role = assignment;
  const app = createApp({
    authService: auth,
    teacherMarksService: new TeacherMarksService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository, authorization };
}

describe('teacher marks API', () => {
  it('denies unauthenticated, wrong-role, missing-permission, membership, and assignment access', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/marks')).status).toBe(401);
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: ['teacher_marks:update'] },
      { membership: false },
      { assignment: false },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/marks')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('lists only authorized assessments with factual known and missing counts', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/marks')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual({ totalAssessments: 1, complete: 0, pendingEntry: 1 });
    expect(response.body.assessments[0]).toMatchObject({
      id: assessmentId,
      rosterCount: 2,
      recordedCount: 1,
      missingCount: 1,
    });
    expect(JSON.stringify(response.body)).not.toContain(unrelatedAssessmentId);
  });

  it('validates and independently authorizes class-scoped filters', async () => {
    const { app, accessToken, repository } = await setup();
    const get = (path: string) =>
      request(app).get(path).set('Authorization', `Bearer ${accessToken}`);
    expect((await get(`/api/v1/teacher/marks?classId=${classId}&search=Unit`)).status).toBe(200);
    expect(repository.queries.at(-1)).toEqual({ classId, search: 'Unit' });
    expect((await get(`/api/v1/teacher/marks?classId=${unassignedClassId}`)).status).toBe(403);
    expect((await get('/api/v1/teacher/marks?classId=bad')).status).toBe(400);
    expect((await get('/api/v1/teacher/marks?teacherId=forged')).status).toBe(400);
  });

  it('returns a minimized active roster and preserves missing mark as null, not zero', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/marks/${assessmentId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.roster).toEqual([
      expect.objectContaining({
        studentId: firstStudentId,
        mark: 84,
        currentMarkId: originalMarkId,
      }),
      expect.objectContaining({ studentId: secondStudentId, mark: null, currentMarkId: null }),
    ]);
    expect(Object.keys(response.body.roster[0])).toEqual([
      'studentId',
      'displayName',
      'mark',
      'currentMarkId',
      'recordedAt',
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /password|token|community|doubt|profile|settings|document|application|parent|permission|rank|percentile/i,
    );
  });

  it('records only explicit marks and leaves omitted students unchanged', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .patch(`/api/v1/teacher/marks/${assessmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ marks: [{ studentId: secondStudentId, value: 0, expectedMarkId: null }] });
    expect(response.status).toBe(200);
    expect(repository.current.get(secondStudentId)?.value).toBe(0);
    expect(repository.current.get(firstStudentId)).toMatchObject({ id: originalMarkId, value: 84 });
    expect(repository.recordedBy).toEqual([teacherId]);
    expect(repository.adjacentWrites).toEqual({
      assignments: 0,
      studentTasks: 0,
      submissions: 0,
      assessments: 0,
      feedback: 0,
    });
  });

  it('revises marks by preserving history with one current version', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .patch(`/api/v1/teacher/marks/${assessmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ marks: [{ studentId: firstStudentId, value: 91, expectedMarkId: originalMarkId }] });
    expect(response.status).toBe(200);
    expect(repository.history).toHaveLength(2);
    expect(repository.history.find(({ id }) => id === originalMarkId)?.supersededAt).not.toBeNull();
    expect(repository.history.filter(({ supersededAt }) => supersededAt === null)).toHaveLength(1);
    expect(repository.current.get(firstStudentId)?.value).toBe(91);
  });

  it('rejects stale writes without changing authoritative state or history', async () => {
    const { app, accessToken, repository } = await setup();
    const before = JSON.stringify({
      current: [...repository.current],
      history: repository.history,
    });
    const response = await request(app)
      .patch(`/api/v1/teacher/marks/${assessmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ marks: [{ studentId: firstStudentId, value: 10, expectedMarkId: randomUUID() }] });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('MARK_CONFLICT');
    expect(JSON.stringify({ current: [...repository.current], history: repository.history })).toBe(
      before,
    );
  });

  it('separates update permission and rejects unauthorized students and assessments', async () => {
    const readOnly = await setup({ permissions: ['teacher_marks:read'] });
    expect(
      (
        await request(readOnly.app)
          .patch(`/api/v1/teacher/marks/${assessmentId}`)
          .set('Authorization', `Bearer ${readOnly.accessToken}`)
          .send({ marks: [{ studentId: secondStudentId, value: 50, expectedMarkId: null }] })
      ).status,
    ).toBe(403);
    const { app, accessToken } = await setup();
    const patch = (id: string, body: object) =>
      request(app)
        .patch(`/api/v1/teacher/marks/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);
    expect(
      (
        await patch(assessmentId, {
          marks: [{ studentId: outsideStudentId, value: 50, expectedMarkId: null }],
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await patch(unrelatedAssessmentId, {
          marks: [{ studentId: secondStudentId, value: 50, expectedMarkId: null }],
        })
      ).status,
    ).toBe(403);
  });

  it('rejects invalid marks, malformed IDs, duplicates, and exposes no assessment mutation', async () => {
    const { app, accessToken } = await setup();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const patch = (body: object) =>
      request(app).patch(`/api/v1/teacher/marks/${assessmentId}`).set(headers).send(body);
    expect(
      (await patch({ marks: [{ studentId: secondStudentId, value: -1, expectedMarkId: null }] }))
        .status,
    ).toBe(400);
    expect(
      (await patch({ marks: [{ studentId: secondStudentId, value: 101, expectedMarkId: null }] }))
        .status,
    ).toBe(400);
    expect(
      (await patch({ marks: [{ studentId: secondStudentId, value: 1.5, expectedMarkId: null }] }))
        .status,
    ).toBe(400);
    expect(
      (
        await patch({
          marks: [
            { studentId: secondStudentId, value: 10, expectedMarkId: null },
            { studentId: secondStudentId, value: 20, expectedMarkId: null },
          ],
        })
      ).status,
    ).toBe(400);
    expect((await request(app).get('/api/v1/teacher/marks/not-a-uuid').set(headers)).status).toBe(
      400,
    );
    expect((await request(app).post('/api/v1/teacher/marks').set(headers).send({})).status).toBe(
      404,
    );
  });
});
