import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { AcademyDashboardRepository } from '../src/modules/academy-dashboard/academy-dashboard.repository.js';
import type { AcademyStudentsRepository } from '../src/modules/academy-students/academy-students.repository.js';
import { AcademyStudentsService } from '../src/modules/academy-students/academy-students.service.js';
import type {
  AcademyStudentDetailRecord,
  AcademyStudentFilters,
  AcademyStudentsRecord,
} from '../src/modules/academy-students/academy-students.types.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { Role } from '../src/modules/authorization/authorization.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const userId = randomUUID();
const academyId = randomUUID();
const batchId = randomUUID();
const foreignBatchId = randomUUID();
const studentId = randomUUID();
const foreignStudentId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class ScopeRepository implements AcademyDashboardRepository {
  enabled = true;
  async findRoleAssignment(queriedUserId: string) {
    return this.enabled && queriedUserId === userId ? { id: 'academy-role', academyId } : null;
  }
  async dashboard() {
    return null;
  }
}

class StudentsRepository implements AcademyStudentsRepository {
  queries: { academyId: string; filters: AcademyStudentFilters }[] = [];
  detailQueries: { academyId: string; studentId: string }[] = [];
  record: AcademyStudentsRecord = {
    academy: { id: academyId, name: 'Helixed Skills Academy' },
    batches: [{ id: batchId, name: 'Robotics Foundations' }],
    enrollments: [
      {
        student: { id: studentId, displayName: 'Aarav Sharma' },
        enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
        batches: [{ id: batchId, name: 'Robotics Foundations' }],
      },
    ],
  };

  async list(queriedAcademyId: string, filters: AcademyStudentFilters) {
    this.queries.push({ academyId: queriedAcademyId, filters });
    return {
      ...this.record,
      enrollments: this.record.enrollments.filter(
        ({ student, batches }) =>
          (!filters.search ||
            student.displayName?.toLowerCase().includes(filters.search.toLowerCase())) &&
          (!filters.batchId || batches.some(({ id }) => id === filters.batchId)),
      ),
    };
  }

  async detail(queriedAcademyId: string, queriedStudentId: string) {
    this.detailQueries.push({ academyId: queriedAcademyId, studentId: queriedStudentId });
    const enrollment = this.record.enrollments.find(
      ({ student }) => student.id === queriedStudentId,
    );
    if (queriedAcademyId !== academyId || !enrollment) return null;
    return {
      academy: this.record.academy,
      student: {
        ...enrollment.student,
        enrolledAt: enrollment.enrolledAt,
        batches: enrollment.batches,
      },
    } satisfies AcademyStudentDetailRecord;
  }
}

async function setup({
  role = 'academy_admin',
  permissions = ['academy_students:read'],
  membership = true,
}: {
  role?: Role;
  permissions?: string[];
  membership?: boolean;
} = {}) {
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'academy-demo',
        displayName: 'Maya Rao',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authorization = new InMemoryAuthorizationRepository();
  authorization.assignments = [
    {
      id: 'academy-role',
      userId,
      role,
      scope: role.startsWith('academy_') ? 'academy' : role === 'teacher' ? 'school' : 'platform',
      schoolId: role === 'teacher' ? randomUUID() : null,
      academyId: role.startsWith('academy_') ? academyId : null,
      permissions,
    },
  ];
  if (membership) authorization.academyMembers.add(`${userId}:${academyId}`);
  authorization.academyResources.add(`${academyId}:academy_students:${academyId}`);
  authorization.academyResources.add(`${academyId}:batch:${batchId}`);
  const scope = new ScopeRepository();
  scope.enabled = role === 'academy_owner' || role === 'academy_admin';
  const repository = new StudentsRepository();
  const app = createApp({
    authService: auth,
    academyStudentsService: new AcademyStudentsService(
      scope,
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'academy-demo', password: 'correct password' });
  return { app, token: login.body.accessToken as string, repository };
}

describe('academy students API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/academy/students')).status).toBe(401);
  });

  it('requires Academy Owner/Admin, explicit permission, and verified membership', async () => {
    for (const options of [
      { role: 'academy_coach' as const },
      { role: 'teacher' as const },
      { role: 'school_admin' as const },
      { permissions: [] as string[] },
      { membership: false },
    ]) {
      const { app, token } = await setup(options);
      expect(
        (await request(app).get('/api/v1/academy/students').set('Authorization', `Bearer ${token}`))
          .status,
      ).toBe(403);
    }
  });

  it('returns only the exact Academy enrollment with canonical batch context', async () => {
    const { app, token, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/academy/students')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(repository.queries).toEqual([{ academyId, filters: {} }]);
    expect(response.body).toEqual({
      academy: { id: academyId, name: 'Helixed Skills Academy' },
      batches: [{ id: batchId, name: 'Robotics Foundations' }],
      students: [
        {
          id: studentId,
          displayName: 'Aarav Sharma',
          enrolledAt: '2026-01-01T00:00:00.000Z',
          batches: [{ id: batchId, name: 'Robotics Foundations' }],
        },
      ],
    });
  });

  it('searches only the authorized roster and independently authorizes batch filters', async () => {
    const { app, token } = await setup();
    const authorized = await request(app)
      .get(`/api/v1/academy/students?search=Aarav&batchId=${batchId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(authorized.status).toBe(200);
    expect(authorized.body.students).toHaveLength(1);

    const noMatch = await request(app)
      .get('/api/v1/academy/students?search=Mira')
      .set('Authorization', `Bearer ${token}`);
    expect(noMatch.status).toBe(200);
    expect(noMatch.body.students).toEqual([]);

    expect(
      (
        await request(app)
          .get(`/api/v1/academy/students?batchId=${foreignBatchId}`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(403);
  });

  it('strictly rejects malformed and client-owned Academy filters', async () => {
    const { app, token } = await setup();
    for (const query of ['batchId=bad', `academyId=${academyId}`, 'search=x&status=ACTIVE'])
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/students?${query}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(400);
  });

  it('handles no-batch and empty rosters without exposing private or scoring data', async () => {
    const { app, token, repository } = await setup({ role: 'academy_owner' });
    repository.record = {
      academy: { id: academyId, name: 'Helixed Skills Academy' },
      batches: [],
      enrollments: [
        {
          student: { id: studentId, displayName: null },
          enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
          batches: [],
        },
      ],
    };
    const response = await request(app)
      .get('/api/v1/academy/students')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.students[0]).toMatchObject({
      id: studentId,
      displayName: 'Student',
      batches: [],
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /login|email|phone|parent|profile|mark|attendance|assignment|AI|message|application|credential|session|token|permission|rank|score|risk|prediction/i,
    );
    expect(
      (await request(app).post('/api/v1/academy/students').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(404);
  });

  it('returns the canonical enrolled Student detail through the exact Academy scope', async () => {
    const { app, token, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/academy/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(repository.detailQueries).toEqual([{ academyId, studentId }]);
    expect(response.body).toEqual({
      academy: { id: academyId, name: 'Helixed Skills Academy' },
      student: {
        id: studentId,
        displayName: 'Aarav Sharma',
        enrolledAt: '2026-01-01T00:00:00.000Z',
        batches: [{ id: batchId, name: 'Robotics Foundations' }],
      },
    });
  });

  it('denies malformed, nonexistent, and unenrolled Student identifiers without disclosure', async () => {
    const { app, token } = await setup();
    expect(
      (
        await request(app)
          .get('/api/v1/academy/students/not-a-uuid')
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(400);
    for (const id of [foreignStudentId, randomUUID()])
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/students/${id}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(403);
  });

  it('applies the same role, permission, and membership boundary to Student detail', async () => {
    for (const options of [
      { role: 'academy_coach' as const },
      { role: 'teacher' as const },
      { role: 'school_admin' as const },
      { permissions: [] as string[] },
      { membership: false },
    ]) {
      const { app, token } = await setup(options);
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/students/${studentId}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(403);
    }
  });

  it('keeps detail minimized and exposes no Student mutation routes', async () => {
    const { app, token, repository } = await setup({ role: 'academy_owner' });
    repository.record.enrollments[0]!.batches = [];
    const response = await request(app)
      .get(`/api/v1/academy/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.student.batches).toEqual([]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /login|email|phone|parent|profile|school|class|subject|mark|attendance|assignment|submission|AI|message|note|application|credential|session|token|permission|rank|score|risk|prediction|coach|certificate/i,
    );
    for (const method of ['post', 'patch', 'put', 'delete'] as const) {
      const mutation = request(app)[method](`/api/v1/academy/students/${studentId}`);
      expect((await mutation.set('Authorization', `Bearer ${token}`)).status).toBe(404);
    }
  });
});
