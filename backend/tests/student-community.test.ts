import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { StudentCommunityService } from '../src/modules/student-community/student-community.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';
import { InMemoryStudentCommunityRepository } from './support/in-memory-student-community.repository.js';

const userId = randomUUID(),
  groupId = randomUUID(),
  conversationId = randomUUID(),
  foreignId = randomUUID();
async function setup() {
  const passwordHash = await hashPassword('correct password');
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'community-student',
        displayName: 'Student',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authz = new InMemoryAuthorizationRepository();
  authz.assignments = [
    {
      id: 'student-role',
      userId,
      role: 'student',
      scope: 'platform',
      schoolId: null,
      academyId: null,
      permissions: ['student_community:read', 'student_community:create'],
    },
  ];
  const repository = new InMemoryStudentCommunityRepository(
    userId,
    'student-role',
    {
      id: conversationId,
      kind: 'group',
      title: 'Robotics Club',
      preview: 'Welcome',
      updatedAt: new Date().toISOString(),
      messages: [],
    },
    {
      id: groupId,
      name: 'Robotics Club',
      description: null,
      visibility: 'student_discoverable',
      memberCount: 2,
      joined: true,
    },
  );
  return createApp({
    authService: auth,
    studentCommunityService: new StudentCommunityService(
      repository,
      new AuthorizationService(authz),
    ),
  });
}
async function token(app: ReturnType<typeof createApp>) {
  return (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'community-student', password: 'correct password' })
  ).body.accessToken as string;
}
describe('student community API', () => {
  it('denies unauthenticated access', async () =>
    expect((await request(await setup()).get('/api/v1/student/community/inbox')).status).toBe(401));
  it('allows only the authenticated student community data and hides foreign identifiers', async () => {
    const app = await setup(),
      accessToken = await token(app);
    expect(
      (
        await request(app)
          .get(`/api/v1/student/community/groups/${groupId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`/api/v1/student/community/groups/${foreignId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
  });
  it('validates and sends only within an authorized conversation', async () => {
    const app = await setup(),
      accessToken = await token(app);
    expect(
      (
        await request(app)
          .post(`/api/v1/student/community/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: '' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/v1/student/community/conversations/${foreignId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: 'Hi' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`/api/v1/student/community/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: 'Hi' })
      ).status,
    ).toBe(201);
  });
});
