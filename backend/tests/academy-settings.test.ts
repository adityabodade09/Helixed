import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type {
  AccountSettingsRecord,
  AccountSettingsRepository,
} from '../src/modules/account-settings/account-settings.service.js';
import { AccountSettingsService } from '../src/modules/account-settings/account-settings.service.js';
import type { AcademyDashboardRepository } from '../src/modules/academy-dashboard/academy-dashboard.repository.js';
import type { AcademySettingsRepository } from '../src/modules/academy-settings/academy-settings.repository.js';
import { AcademySettingsService } from '../src/modules/academy-settings/academy-settings.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { verifyAccessToken } from '../src/modules/auth/token.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { Role } from '../src/modules/authorization/authorization.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const userId = randomUUID();
const otherUserId = randomUUID();
const academyId = randomUUID();
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

class AcademyRepository implements AcademySettingsRepository {
  queriedAcademyIds: string[] = [];
  async findAcademy(queriedAcademyId: string) {
    this.queriedAcademyIds.push(queriedAcademyId);
    return queriedAcademyId === academyId
      ? { id: academyId, name: 'Helixed Skills Academy' }
      : null;
  }
}

class AccountRepository implements AccountSettingsRepository {
  sessionId = '';
  queriedUserIds: string[] = [];

  async findAccount(queriedUserId: string): Promise<AccountSettingsRecord | null> {
    this.queriedUserIds.push(queriedUserId);
    if (queriedUserId !== userId) return null;
    const now = new Date();
    return {
      account: {
        id: userId,
        loginIdentifier: 'academy-demo',
        displayName: 'Maya Rao',
        accountState: 'ACTIVE',
      },
      sessions: [
        {
          id: this.sessionId,
          createdAt: now,
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      ],
    };
  }
}

async function setup({
  role = 'academy_admin',
  permissions = ['academy_settings:read'],
  membership = true,
  resource = true,
}: {
  role?: Role;
  permissions?: string[];
  membership?: boolean;
  resource?: boolean;
} = {}) {
  const authRepository = new InMemoryAuthRepository([
    {
      id: userId,
      loginIdentifier: 'academy-demo',
      displayName: 'Maya Rao',
      accountState: 'ACTIVE',
      passwordHash,
    },
    {
      id: otherUserId,
      loginIdentifier: 'other-user',
      displayName: 'Other User',
      accountState: 'ACTIVE',
      passwordHash,
    },
  ]);
  const auth = new AuthService(authRepository);
  const authorizationRepository = new InMemoryAuthorizationRepository();
  authorizationRepository.assignments = [
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
  if (membership) authorizationRepository.academyMembers.add(`${userId}:${academyId}`);
  if (resource)
    authorizationRepository.academyResources.add(`${academyId}:academy_settings:${academyId}`);

  const scope = new ScopeRepository();
  scope.enabled = role === 'academy_owner' || role === 'academy_admin';
  const academyRepository = new AcademyRepository();
  const accountRepository = new AccountRepository();
  const app = createApp({
    authService: auth,
    academySettingsService: new AcademySettingsService(
      scope,
      academyRepository,
      new AccountSettingsService(accountRepository),
      new AuthorizationService(authorizationRepository),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'academy-demo', password: 'correct password' });
  const token = login.body.accessToken as string;
  accountRepository.sessionId = (await verifyAccessToken(token)).sessionId;
  return { app, token, academyRepository, accountRepository };
}

describe('academy settings API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/academy/settings')).status).toBe(401);
  });

  it('returns only the authenticated account, exact Academy, and sanitized sessions', async () => {
    const { app, token, academyRepository, accountRepository } = await setup({
      role: 'academy_owner',
    });
    const response = await request(app)
      .get('/api/v1/academy/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(academyRepository.queriedAcademyIds).toEqual([academyId]);
    expect(accountRepository.queriedUserIds).toEqual([userId]);
    expect(response.body.academy).toEqual({ id: academyId, name: 'Helixed Skills Academy' });
    expect(response.body.account).toEqual({
      id: userId,
      loginIdentifier: 'academy-demo',
      displayName: 'Maya Rao',
      accountState: 'ACTIVE',
    });
    expect(response.body.sessions[0].current).toBe(true);
    expect(Object.keys(response.body.sessions[0]).sort()).toEqual(
      ['createdAt', 'current', 'expiresAt', 'id', 'lastSeenAt'].sort(),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /Other User|password|credential|token|permission|roleAssignment|membership/i,
    );
  });

  it('requires Owner/Admin, explicit permission, active membership, and exact scope', async () => {
    for (const options of [
      { role: 'academy_coach' as const },
      { role: 'teacher' as const },
      { role: 'parent' as const },
      { role: 'student' as const },
      { permissions: [] as string[] },
      { membership: false },
      { resource: false },
    ]) {
      const { app, token } = await setup(options);
      expect(
        (await request(app).get('/api/v1/academy/settings').set('Authorization', `Bearer ${token}`))
          .status,
      ).toBe(403);
    }
  });

  it('rejects client-selected account and Academy identifiers', async () => {
    const { app, token, academyRepository, accountRepository } = await setup();
    const response = await request(app)
      .get(`/api/v1/academy/settings?userId=${otherUserId}&academyId=${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(academyRepository.queriedAcademyIds).toEqual([]);
    expect(accountRepository.queriedUserIds).toEqual([]);
  });

  it('uses canonical logout-all without revoking another user', async () => {
    const { app, token } = await setup();
    const otherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'other-user', password: 'correct password' });
    const otherToken = otherLogin.body.accessToken as string;

    expect(
      (await request(app).post('/api/v1/auth/logout-all').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(204);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status,
    ).toBe(401);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${otherToken}`))
        .status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/v1/academy/settings/logout-all')
          .set('Authorization', `Bearer ${otherToken}`)
      ).status,
    ).toBe(404);
  });
});
