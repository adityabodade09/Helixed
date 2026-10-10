import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { AcademyCoachesRepository } from '../src/modules/academy-coaches/academy-coaches.repository.js';
import { AcademyCoachesService } from '../src/modules/academy-coaches/academy-coaches.service.js';
import type { AcademyCoachesRecord } from '../src/modules/academy-coaches/academy-coaches.types.js';
import type { AcademyDashboardRepository } from '../src/modules/academy-dashboard/academy-dashboard.repository.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { Role } from '../src/modules/authorization/authorization.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const userId = randomUUID();
const academyId = randomUUID();
const coachId = randomUUID();
const batchId = randomUUID();
const secondBatchId = randomUUID();
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

class CoachesRepository implements AcademyCoachesRepository {
  queries: { academyId: string; search?: string }[] = [];
  record: AcademyCoachesRecord = {
    academy: { id: academyId, name: 'Helixed Skills Academy' },
    coaches: [
      {
        user: { id: coachId, displayName: 'Neha Kapoor' },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        batches: [
          { id: secondBatchId, name: 'Robotics Advanced' },
          { id: batchId, name: 'Robotics Foundations' },
          { id: batchId, name: 'Robotics Foundations' },
        ],
      },
      {
        user: { id: randomUUID(), displayName: 'Asha Bose' },
        joinedAt: new Date('2026-02-01T00:00:00.000Z'),
        batches: [],
      },
    ],
  };

  async list(queriedAcademyId: string, filters: { search?: string }) {
    this.queries.push({ academyId: queriedAcademyId, search: filters.search });
    if (queriedAcademyId !== academyId) return null;
    return {
      ...this.record,
      coaches: filters.search
        ? this.record.coaches.filter(({ user }) =>
            user.displayName?.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : this.record.coaches,
    };
  }
}

async function setup({
  role = 'academy_admin',
  permissions = ['academy_coaches:read'],
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
  if (resource) authorization.academyResources.add(`${academyId}:academy_coaches:${academyId}`);

  const scope = new ScopeRepository();
  scope.enabled = role === 'academy_owner' || role === 'academy_admin';
  const repository = new CoachesRepository();
  const app = createApp({
    authService: auth,
    academyCoachesService: new AcademyCoachesService(
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

describe('academy coaches API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/academy/coaches')).status).toBe(401);
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
        (await request(app).get('/api/v1/academy/coaches').set('Authorization', `Bearer ${token}`))
          .status,
      ).toBe(403);
    }
  });

  it('returns each canonical Coach once with distinct, sorted exact-Academy batch context', async () => {
    const { app, token, repository } = await setup({ role: 'academy_owner' });
    const response = await request(app)
      .get('/api/v1/academy/coaches')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(repository.queries).toEqual([{ academyId, search: undefined }]);
    expect(response.body.summary).toEqual({ coaches: 2 });
    expect(response.body.coaches).toEqual([
      {
        id: expect.any(String),
        displayName: 'Asha Bose',
        joinedAt: '2026-02-01T00:00:00.000Z',
        batchCount: 0,
        batches: [],
      },
      {
        id: coachId,
        displayName: 'Neha Kapoor',
        joinedAt: '2026-01-01T00:00:00.000Z',
        batchCount: 2,
        batches: [
          { id: secondBatchId, name: 'Robotics Advanced' },
          { id: batchId, name: 'Robotics Foundations' },
        ],
      },
    ]);
  });

  it('searches only the scoped canonical population and strictly rejects unsupported queries', async () => {
    const { app, token, repository } = await setup();
    const searched = await request(app)
      .get('/api/v1/academy/coaches?search=neha')
      .set('Authorization', `Bearer ${token}`);
    expect(searched.status).toBe(200);
    expect(searched.body.coaches).toHaveLength(1);
    expect(repository.queries).toEqual([{ academyId, search: 'neha' }]);

    for (const query of [
      `academyId=${academyId}`,
      'status=ACTIVE',
      `batchId=${batchId}`,
      `search=${'x'.repeat(101)}`,
    ])
      expect(
        (
          await request(app)
            .get(`/api/v1/academy/coaches?${query}`)
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(400);
  });

  it('supports a factual empty roster and exposes a minimized private-data-free DTO', async () => {
    const { app, token, repository } = await setup();
    repository.record = { ...repository.record, coaches: [] };
    const response = await request(app)
      .get('/api/v1/academy/coaches')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.coaches).toEqual([]);
    expect(response.body.summary).toEqual({ coaches: 0 });
    expect(JSON.stringify(response.body)).not.toMatch(
      /login|email|phone|credential|session|token|password|profile|school|student|parent|permission|rating|performance|engagement|risk|rank|prediction|recommendation|AI/i,
    );
  });

  it('remains read-only with no detail or Coach-management routes', async () => {
    const { app, token } = await setup();
    for (const target of ['/api/v1/academy/coaches', `/api/v1/academy/coaches/${coachId}`]) {
      for (const method of ['post', 'patch', 'put', 'delete'] as const) {
        expect(
          (await request(app)[method](target).set('Authorization', `Bearer ${token}`)).status,
        ).toBe(404);
      }
    }
    expect(
      (
        await request(app)
          .get(`/api/v1/academy/coaches/${coachId}`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(404);
  });
});
