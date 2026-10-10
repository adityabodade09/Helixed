import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type {
  AssignmentFilters,
  TeacherAssignmentsRepository,
} from '../src/modules/teacher-assignments/teacher-assignments.repository.js';
import { TeacherAssignmentsService } from '../src/modules/teacher-assignments/teacher-assignments.service.js';
import type {
  CreateAssignmentInput,
  TeacherAssignment,
  TeacherAssignmentsRecord,
} from '../src/modules/teacher-assignments/teacher-assignments.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
const unassignedClassId = randomUUID();
const assignmentId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class AssignmentsRepository implements TeacherAssignmentsRepository {
  classes = true;
  queries: AssignmentFilters[] = [];
  created: {
    teacherId: string;
    schoolId: string;
    input: CreateAssignmentInput;
    assignment: TeacherAssignment;
  }[] = [];

  async findTeacherRoleAssignment(userId: string) {
    return userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async list(
    queriedTeacherId: string,
    queriedSchoolId: string,
    _now: Date,
    filters: AssignmentFilters,
  ): Promise<TeacherAssignmentsRecord | null> {
    if (queriedTeacherId !== teacherId || queriedSchoolId !== schoolId) return null;
    this.queries.push(filters);
    const candidate = {
      id: assignmentId,
      title: 'Linear Equations Worksheet',
      subjectName: 'Mathematics',
      dueAt: new Date(Date.now() + 3 * 86_400_000),
      status: 'OPEN' as const,
      createdAt: new Date('2026-10-01T08:00:00Z'),
    };
    const matches =
      (!filters.status || candidate.status === filters.status) &&
      (!filters.search ||
        `${candidate.title} ${candidate.subjectName}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()));
    const created = this.created
      .map(({ assignment }) => ({
        ...assignment,
        dueAt: assignment.dueAt ? new Date(assignment.dueAt) : null,
        createdAt: new Date(assignment.createdAt),
      }))
      .filter(
        (item) =>
          (!filters.status || item.status === filters.status) &&
          (!filters.search ||
            `${item.title} ${item.subjectName}`
              .toLowerCase()
              .includes(filters.search.toLowerCase())),
      );
    return {
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      school: { id: schoolId, name: 'Helixed Demo School' },
      classes: this.classes
        ? [
            {
              id: classId,
              name: 'Class 12',
              subjects: ['Mathematics', 'Physics'],
              assignments: [...(matches ? [candidate] : []), ...created],
            },
          ]
        : [],
    };
  }

  async create(
    queriedTeacherId: string,
    queriedSchoolId: string,
    _now: Date,
    input: CreateAssignmentInput,
  ): Promise<TeacherAssignment | null> {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      !this.classes ||
      input.classId !== classId ||
      !['Mathematics', 'Physics'].includes(input.subjectName)
    ) {
      return null;
    }
    const assignment: TeacherAssignment = {
      id: randomUUID(),
      title: input.title,
      class: { id: classId, name: 'Class 12' },
      subjectName: input.subjectName,
      dueAt: input.dueAt ?? null,
      status: input.status,
      createdAt: new Date().toISOString(),
    };
    this.created.push({
      teacherId: queriedTeacherId,
      schoolId: queriedSchoolId,
      input,
      assignment,
    });
    return assignment;
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_assignments:read', 'teacher_assignments:create'],
  membership = true,
  assigned = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  membership?: boolean;
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
  if (membership) authorization.schoolMembers.add(`${teacherId}:${schoolId}`);
  if (assigned) authorization.teacherClasses.add(`${teacherId}:${schoolId}:${classId}`);
  const repository = new AssignmentsRepository();
  repository.classes = assigned;
  const app = createApp({
    authService: auth,
    teacherAssignmentsService: new TeacherAssignmentsService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository };
}

describe('teacher assignments API', () => {
  it('denies unauthenticated access and requires Teacher role, membership, and permission', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/assignments')).status).toBe(401);
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { membership: false },
      { permissions: [] as string[] },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/assignments')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('returns only the canonical authorized Assignment projection without student-private data', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/assignments')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.assignments).toEqual([
      expect.objectContaining({
        id: assignmentId,
        title: 'Linear Equations Worksheet',
        class: { id: classId, name: 'Class 12' },
        subjectName: 'Mathematics',
        status: 'OPEN',
      }),
    ]);
    expect(response.body.summary).toEqual({ total: 1, active: 1, dueThisWeek: 1 });
    expect(response.body.classes).toEqual([
      { id: classId, name: 'Class 12', subjects: ['Mathematics', 'Physics'] },
    ]);
    expect(Object.keys(response.body.assignments[0]).sort()).toEqual(
      ['id', 'title', 'class', 'subjectName', 'dueAt', 'status', 'createdAt'].sort(),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /studentId|submission|mark|score|password|token|community|profile|parent|permission/i,
    );
  });

  it('independently authorizes class filters and rejects malformed or forged filters', async () => {
    const { app, accessToken, repository } = await setup();
    const get = (path: string) =>
      request(app).get(path).set('Authorization', `Bearer ${accessToken}`);
    expect((await get(`/api/v1/teacher/assignments?classId=${classId}`)).status).toBe(200);
    expect(repository.queries.at(-1)).toMatchObject({ classId });
    expect((await get(`/api/v1/teacher/assignments?classId=${unassignedClassId}`)).status).toBe(
      403,
    );
    expect((await get('/api/v1/teacher/assignments?classId=bad')).status).toBe(400);
    expect((await get('/api/v1/teacher/assignments?status=GRADED')).status).toBe(400);
    expect((await get('/api/v1/teacher/assignments?teacherId=forged')).status).toBe(400);
  });

  it('searches and filters only inside the authorized Assignment population', async () => {
    const { app, accessToken } = await setup();
    const get = (query: string) =>
      request(app)
        .get(`/api/v1/teacher/assignments?${query}`)
        .set('Authorization', `Bearer ${accessToken}`);
    expect((await get('search=linear')).body.assignments).toHaveLength(1);
    expect((await get('search=unassigned')).body.assignments).toEqual([]);
    expect((await get('status=DRAFT')).body.assignments).toEqual([]);
  });

  it('returns a successful empty result without a school-wide fallback', async () => {
    const { app, accessToken } = await setup({ assigned: false });
    const response = await request(app)
      .get('/api/v1/teacher/assignments')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.assignments).toEqual([]);
    expect(response.body.classes).toEqual([]);
  });

  it('creates a canonical Assignment with authenticated provenance and no adjacent-domain writes', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .post('/api/v1/teacher/assignments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        classId,
        title: '  Fractions practice  ',
        description: 'Complete questions 1–10.',
        subjectName: 'Mathematics',
        dueAt: '2026-10-10T12:00:00.000Z',
        status: 'DRAFT',
      });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Fractions practice',
        class: { id: classId, name: 'Class 12' },
        subjectName: 'Mathematics',
        status: 'DRAFT',
      }),
    );
    expect(repository.created).toEqual([
      expect.objectContaining({
        teacherId,
        schoolId,
        input: expect.objectContaining({ title: 'Fractions practice', classId }),
      }),
    ]);
    const listed = await request(app)
      .get('/api/v1/teacher/assignments?search=fractions')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listed.body.assignments).toEqual([
      expect.objectContaining({
        title: 'Fractions practice',
        class: { id: classId, name: 'Class 12' },
      }),
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /createdBy|teacherId|student|submission|mark|assessment|feedback|password|token|parent/i,
    );
  });

  it('separates read and create permission and exact-class authorization', async () => {
    const payload = {
      classId,
      title: 'Authorized work',
      subjectName: 'Mathematics',
      status: 'PUBLISHED',
    };
    const readOnly = await setup({ permissions: ['teacher_assignments:read'] });
    expect(
      (
        await request(readOnly.app)
          .post('/api/v1/teacher/assignments')
          .set('Authorization', `Bearer ${readOnly.accessToken}`)
          .send(payload)
      ).status,
    ).toBe(403);

    expect(
      (await request(createApp()).post('/api/v1/teacher/assignments').send(payload)).status,
    ).toBe(401);
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { membership: false },
    ]) {
      const denied = await setup(options);
      expect(
        (
          await request(denied.app)
            .post('/api/v1/teacher/assignments')
            .set('Authorization', `Bearer ${denied.accessToken}`)
            .send(payload)
        ).status,
      ).toBe(403);
    }

    const { app, accessToken } = await setup();
    for (const invalidPayload of [
      { ...payload, classId: unassignedClassId },
      { ...payload, subjectName: 'Manufactured subject' },
    ]) {
      expect(
        (
          await request(app)
            .post('/api/v1/teacher/assignments')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(invalidPayload)
        ).status,
      ).toBe(403);
    }
  });

  it('strictly validates canonical creation fields and initial lifecycle states', async () => {
    const { app, accessToken, repository } = await setup();
    const post = (body: object) =>
      request(app)
        .post('/api/v1/teacher/assignments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);
    const base = { classId, title: 'Work', subjectName: 'Mathematics', status: 'DRAFT' };
    for (const body of [
      { ...base, classId: 'bad' },
      { ...base, title: ' ' },
      { ...base, title: 'x'.repeat(241) },
      { ...base, description: 'x'.repeat(5001) },
      { ...base, dueAt: 'tomorrow' },
      { ...base, status: 'OPEN' },
      { ...base, teacherId },
      { ...base, createdBy: teacherId },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(repository.created).toEqual([]);
  });

  it('exposes no unsupported assignment mutations or adjacent workflows', async () => {
    const { app, accessToken } = await setup();
    const headers = { Authorization: `Bearer ${accessToken}` };
    expect(
      (await request(app).post('/api/v1/teacher/assignments/create').set(headers)).status,
    ).toBe(404);
    expect(
      (await request(app).patch(`/api/v1/teacher/assignments/${assignmentId}`).set(headers)).status,
    ).toBe(404);
    expect(
      (await request(app).post(`/api/v1/teacher/assignments/${assignmentId}/submit`).set(headers))
        .status,
    ).toBe(404);
  });
});
