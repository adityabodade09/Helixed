import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { AcademyBatchesRepository } from '../src/modules/academy-batches/academy-batches.repository.js';
import { AcademyBatchesService } from '../src/modules/academy-batches/academy-batches.service.js';
import type { AcademyBatchDetailRecord } from '../src/modules/academy-batches/academy-batches.types.js';
import type { AcademyDashboardRecord } from '../src/modules/academy-dashboard/academy-dashboard.types.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { Role } from '../src/modules/authorization/authorization.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const userId = randomUUID();
const academyId = randomUUID();
const firstBatchId = randomUUID();
const secondBatchId = randomUUID();
const studentId = randomUUID();
const secondStudentId = randomUUID();
const coachId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class BatchesRepository implements AcademyBatchesRepository {
  enabled = true;
  queriedAcademies: string[] = [];
  detailQueries: { academyId: string; batchId: string }[] = [];
  record: AcademyDashboardRecord = {
    academy: { id: academyId, name: 'Helixed Skills Academy' },
    enrolledStudentIds: [studentId, studentId, secondStudentId],
    batches: [
      {
        id: firstBatchId,
        name: 'Creative Computing',
        studentIds: [studentId, studentId],
        coachIds: [coachId, coachId],
      },
      {
        id: secondBatchId,
        name: 'Robotics Foundations',
        studentIds: [secondStudentId],
        coachIds: [coachId],
      },
    ],
  };
  details = new Map<string, AcademyBatchDetailRecord>([
    [
      firstBatchId,
      {
        academy: { id: academyId, name: 'Helixed Skills Academy' },
        batch: { id: firstBatchId, name: 'Creative Computing' },
        students: [
          { id: studentId, displayName: 'Aarav Sharma' },
          { id: studentId, displayName: 'Aarav Sharma' },
        ],
        coaches: [
          { id: coachId, displayName: 'Neha Kapoor' },
          { id: coachId, displayName: 'Neha Kapoor' },
        ],
      },
    ],
  ]);

  async findRoleAssignment(queriedUserId: string) {
    return this.enabled && queriedUserId === userId ? { id: 'academy-role', academyId } : null;
  }

  async dashboard(queriedAcademyId: string) {
    this.queriedAcademies.push(queriedAcademyId);
    return queriedAcademyId === academyId ? this.record : null;
  }

  async batchDetail(queriedAcademyId: string, queriedBatchId: string) {
    this.detailQueries.push({ academyId: queriedAcademyId, batchId: queriedBatchId });
    return queriedAcademyId === academyId ? (this.details.get(queriedBatchId) ?? null) : null;
  }
}

async function setup({
  role = 'academy_admin',
  permissions = ['academy_batches:read'],
  membership = true,
  resource = true,
}: {
  role?: Role;
  permissions?: string[];
  membership?: boolean;
  resource?: boolean;
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
  if (resource) {
    authorization.academyResources.add(`${academyId}:academy_batches:${academyId}`);
    authorization.academyResources.add(`${academyId}:batch:${firstBatchId}`);
  }

  const repository = new BatchesRepository();
  repository.enabled = role === 'academy_owner' || role === 'academy_admin';
  const app = createApp({
    authService: auth,
    academyBatchesService: new AcademyBatchesService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'academy-demo', password: 'correct password' });
  return { app, token: login.body.accessToken as string, repository };
}

describe('academy batches API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/academy/batches')).status).toBe(401);
    expect((await request(createApp()).get(`/api/v1/academy/batches/${firstBatchId}`)).status).toBe(
      401,
    );
  });

  it('requires Academy Owner/Admin, explicit permission, verified membership, and exact scope', async () => {
    for (const options of [
      { role: 'academy_coach' as const },
      { role: 'teacher' as const },
      { role: 'school_admin' as const },
      { permissions: [] as string[] },
      { membership: false },
      { resource: false },
    ]) {
      const { app, token } = await setup(options);
      expect(
        (await request(app).get('/api/v1/academy/batches').set('Authorization', `Bearer ${token}`))
          .status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/batches/${firstBatchId}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(403);
    }
  });

  it('returns exact-Academy canonical batch detail with matching distinct member counts', async () => {
    const { app, token, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/academy/batches/${firstBatchId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(repository.detailQueries).toEqual([{ academyId, batchId: firstBatchId }]);
    expect(response.body).toEqual({
      academy: { id: academyId, name: 'Helixed Skills Academy' },
      batch: { id: firstBatchId, name: 'Creative Computing' },
      summary: { students: 1, coaches: 1 },
      students: [{ id: studentId, displayName: 'Aarav Sharma' }],
      coaches: [{ id: coachId, displayName: 'Neha Kapoor' }],
    });
  });

  it('rejects malformed, nonexistent, and foreign batch IDs without revealing existence', async () => {
    const { app, token } = await setup();
    expect(
      (
        await request(app)
          .get('/api/v1/academy/batches/not-a-uuid')
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(400);
    for (const batchId of [secondBatchId, randomUUID()]) {
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/batches/${batchId}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(403);
    }
  });

  it('keeps detail minimized and exposes no lifecycle, private data, analytics, or mutations', async () => {
    const { app, token } = await setup();
    const response = await request(app)
      .get(`/api/v1/academy/batches/${firstBatchId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toMatch(
      /status|schedule|program|capacity|session|mark|attendance|assignment|profile|parent|email|phone|message|credential|token|permission|rank|score|risk|prediction|recommendation|AI/i,
    );
    for (const method of ['post', 'patch', 'put', 'delete'] as const) {
      const mutation = request(app)[method](`/api/v1/academy/batches/${firstBatchId}`);
      expect((await mutation.set('Authorization', `Bearer ${token}`)).status).toBe(404);
    }
  });

  it('returns exact-Academy canonical batches and distinct factual counts', async () => {
    const { app, token, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/academy/batches')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(repository.queriedAcademies).toEqual([academyId]);
    expect(response.body).toEqual({
      academy: { id: academyId, name: 'Helixed Skills Academy' },
      summary: { batches: 2, enrolledStudents: 2, assignedCoaches: 1 },
      batches: [
        { id: firstBatchId, name: 'Creative Computing', studentCount: 1, coachCount: 1 },
        { id: secondBatchId, name: 'Robotics Foundations', studentCount: 1, coachCount: 1 },
      ],
    });
  });

  it('searches only the authorized batch population and keeps stable canonical IDs', async () => {
    const { app, token } = await setup({ role: 'academy_owner' });
    const response = await request(app)
      .get('/api/v1/academy/batches?search=robotics')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.batches).toEqual([
      { id: secondBatchId, name: 'Robotics Foundations', studentCount: 1, coachCount: 1 },
    ]);
    expect(response.body.summary).toEqual({ batches: 2, enrolledStudents: 2, assignedCoaches: 1 });
  });

  it('strictly rejects malformed or unsupported filters and exposes no lifecycle', async () => {
    const { app, token } = await setup();
    for (const query of [
      `academyId=${academyId}`,
      'status=ACTIVE',
      `batchId=${firstBatchId}`,
      `search=${'x'.repeat(101)}`,
    ])
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/batches?${query}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(400);
  });

  it('returns a minimized read-only DTO without private, academic, lifecycle, or scoring data', async () => {
    const { app, token, repository } = await setup();
    repository.record = {
      academy: { id: academyId, name: 'Empty Academy' },
      enrolledStudentIds: [],
      batches: [],
    };
    const response = await request(app)
      .get('/api/v1/academy/batches')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.batches).toEqual([]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /status|active batch|schedule|program|capacity|next session|mark|attendance|assignment|profile|parent|message|credential|session|token|permission|rank|score|risk|prediction|recommendation|AI/i,
    );
    for (const method of ['post', 'patch', 'put', 'delete'] as const) {
      const mutation = request(app)[method]('/api/v1/academy/batches');
      expect((await mutation.set('Authorization', `Bearer ${token}`)).status).toBe(404);
    }
  });
});
