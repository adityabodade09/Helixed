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
import type { TeacherSettingsRepository } from '../src/modules/teacher-settings/teacher-settings.repository.js';
import { TeacherSettingsService } from '../src/modules/teacher-settings/teacher-settings.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const studentId = randomUUID();
const otherTeacherId = randomUUID();
const schoolId = randomUUID();

class TeacherRoleRepository implements TeacherSettingsRepository {
  async findTeacherRoleAssignmentId(userId: string) {
    return userId === teacherId ? 'teacher-role' : null;
  }
}

class AccountRepository implements AccountSettingsRepository {
  sessionId = '';
  queriedUserIds: string[] = [];

  async findAccount(userId: string): Promise<AccountSettingsRecord | null> {
    this.queriedUserIds.push(userId);
    if (userId !== teacherId) return null;
    const now = new Date();
    return {
      account: {
        id: teacherId,
        loginIdentifier: 'teacher-demo',
        displayName: 'Neha Kapoor',
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
  role = 'teacher',
  permissions = ['teacher_settings:read'],
  verifiedMembership = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  verifiedMembership?: boolean;
} = {}) {
  const passwordHash = await hashPassword('correct password');
  const authRepository = new InMemoryAuthRepository([
    {
      id: teacherId,
      loginIdentifier: 'teacher-demo',
      displayName: 'Neha Kapoor',
      accountState: 'ACTIVE',
      passwordHash,
    },
    {
      id: studentId,
      loginIdentifier: 'student-demo',
      displayName: 'Aarav Sharma',
      accountState: 'ACTIVE',
      passwordHash,
    },
    {
      id: otherTeacherId,
      loginIdentifier: 'other-teacher',
      displayName: 'Other Teacher',
      accountState: 'ACTIVE',
      passwordHash,
    },
  ]);
  const auth = new AuthService(authRepository);
  const authorizationRepository = new InMemoryAuthorizationRepository();
  authorizationRepository.assignments = [
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
  if (verifiedMembership) authorizationRepository.schoolMembers.add(`${teacherId}:${schoolId}`);
  const accountRepository = new AccountRepository();
  const app = createApp({
    authService: auth,
    teacherSettingsService: new TeacherSettingsService(
      new TeacherRoleRepository(),
      new AccountSettingsService(accountRepository),
      new AuthorizationService(authorizationRepository),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  const accessToken = login.body.accessToken as string;
  accountRepository.sessionId = (await verifyAccessToken(accessToken)).sessionId;
  return { app, accessToken, accountRepository };
}

describe('teacher settings API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/settings')).status).toBe(401);
  });

  it('returns only the authenticated Teacher account and sanitized current session', async () => {
    const { app, accessToken, accountRepository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/settings')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(accountRepository.queriedUserIds).toEqual([teacherId]);
    expect(response.body.account).toEqual({
      id: teacherId,
      loginIdentifier: 'teacher-demo',
      displayName: 'Neha Kapoor',
      accountState: 'ACTIVE',
    });
    expect(response.body.sessions).toHaveLength(1);
    expect(response.body.sessions[0].current).toBe(true);
    expect(Object.keys(response.body.sessions[0]).sort()).toEqual(
      ['createdAt', 'current', 'expiresAt', 'id', 'lastSeenAt'].sort(),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /Aarav|Other Teacher|password|credential|token|permission|roleAssignment|schoolMembership/i,
    );
  });

  it('requires Teacher role, verified school membership, and explicit permission', async () => {
    for (const configuration of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: [] as string[] },
      { verifiedMembership: false },
    ]) {
      const { app, accessToken } = await setup(configuration);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/settings')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('rejects client-supplied account ownership identifiers', async () => {
    const { app, accessToken, accountRepository } = await setup();
    expect(
      (
        await request(app)
          .get(`/api/v1/teacher/settings?userId=${otherTeacherId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
    expect(accountRepository.queriedUserIds).toEqual([]);
  });

  it('uses canonical logout-all and does not revoke another user session', async () => {
    const { app, accessToken } = await setup();
    const studentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'student-demo', password: 'correct password' });
    const studentToken = studentLogin.body.accessToken as string;

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
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${studentToken}`))
        .status,
    ).toBe(200);
  });
});
