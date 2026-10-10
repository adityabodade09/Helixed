import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type {
  AccountSettingsRecord,
  AccountSettingsRepository,
} from '../src/modules/account-settings/account-settings.service.js';
import { AccountSettingsService } from '../src/modules/account-settings/account-settings.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { verifyAccessToken } from '../src/modules/auth/token.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { ParentSettingsRepository } from '../src/modules/parent-settings/parent-settings.repository.js';
import { ParentSettingsService } from '../src/modules/parent-settings/parent-settings.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const parentId = randomUUID();
const childId = randomUUID();
const teacherId = randomUUID();

class ParentRoleRepository implements ParentSettingsRepository {
  async findParentRoleAssignmentId(userId: string) {
    return userId === parentId ? 'parent-role' : null;
  }
}

class AccountRepository implements AccountSettingsRepository {
  sessionId = '';
  async findAccount(userId: string): Promise<AccountSettingsRecord | null> {
    if (userId !== parentId) return null;
    const now = new Date();
    return {
      account: {
        id: parentId,
        loginIdentifier: 'parent-demo',
        displayName: 'Anita Sharma',
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

async function setup(
  permissions = ['parent_settings:read'],
  role: 'parent' | 'student' = 'parent',
) {
  const passwordHash = await hashPassword('correct password');
  const authRepository = new InMemoryAuthRepository([
    {
      id: parentId,
      loginIdentifier: 'parent-demo',
      displayName: 'Anita Sharma',
      accountState: 'ACTIVE',
      passwordHash,
    },
    {
      id: childId,
      loginIdentifier: 'student-demo',
      displayName: 'Aarav Sharma',
      accountState: 'ACTIVE',
      passwordHash,
    },
    {
      id: teacherId,
      loginIdentifier: 'teacher-demo',
      displayName: 'Neha Kapoor',
      accountState: 'ACTIVE',
      passwordHash,
    },
  ]);
  const auth = new AuthService(authRepository);
  const authorizationRepository = new InMemoryAuthorizationRepository();
  authorizationRepository.assignments = [
    {
      id: 'parent-role',
      userId: parentId,
      role,
      scope: 'platform',
      schoolId: null,
      academyId: null,
      permissions,
    },
  ];
  const accountRepository = new AccountRepository();
  const app = createApp({
    authService: auth,
    parentSettingsService: new ParentSettingsService(
      new ParentRoleRepository(),
      new AccountSettingsService(accountRepository),
      new AuthorizationService(authorizationRepository),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'parent-demo', password: 'correct password' });
  const accessToken = login.body.accessToken as string;
  accountRepository.sessionId = (await verifyAccessToken(accessToken)).sessionId;
  return { app, accessToken };
}

describe('parent settings API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/settings')).status).toBe(401);
  });

  it('returns only the authenticated Parent account and safely identifies its current session', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/parent/settings')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.account).toEqual({
      id: parentId,
      loginIdentifier: 'parent-demo',
      displayName: 'Anita Sharma',
      accountState: 'ACTIVE',
    });
    expect(response.body.sessions).toHaveLength(1);
    expect(response.body.sessions[0].current).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(
      /Aarav|Neha|passwordHash|tokenHash|refreshToken|permission/i,
    );
  });

  it('requires the active Parent role and explicit read permission', async () => {
    for (const configuration of [
      { permissions: [] as string[], role: 'parent' as const },
      { permissions: ['parent_settings:read'], role: 'student' as const },
    ]) {
      const { app, accessToken } = await setup(configuration.permissions, configuration.role);
      expect(
        (
          await request(app)
            .get('/api/v1/parent/settings')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('rejects client-supplied ownership identifiers', async () => {
    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .get(`/api/v1/parent/settings?userId=${childId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
  });

  it('uses canonical logout-all to revoke only the authenticated Parent sessions', async () => {
    const { app, accessToken } = await setup();
    const childLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'student-demo', password: 'correct password' });
    const childToken = childLogin.body.accessToken as string;

    expect(
      (
        await request(app)
          .post('/api/v1/auth/logout-all')
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(204);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`))
        .status,
    ).toBe(401);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${childToken}`))
        .status,
    ).toBe(200);
  });
});
