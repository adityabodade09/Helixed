import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { StudentOpportunitiesService } from '../src/modules/student-opportunities/student-opportunities.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';
import { InMemoryStudentOpportunitiesRepository } from './support/in-memory-student-opportunities.repository.js';
const userId = randomUUID(),
  opportunityId = randomUUID();
async function setup() {
  const passwordHash = await hashPassword('correct password');
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'opportunity-student',
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
      permissions: ['student_opportunities:read', 'student_opportunities:create'],
    },
  ];
  const repo = new InMemoryStudentOpportunitiesRepository(userId, 'student-role', {
    id: opportunityId,
    title: 'Robotics',
    detail: null,
    description: null,
    category: null,
    source: null,
    location: null,
    deadline: null,
    isOpen: true,
    saved: false,
    application: null,
  });
  return createApp({
    authService: auth,
    studentOpportunitiesService: new StudentOpportunitiesService(
      repo,
      new AuthorizationService(authz),
    ),
  });
}
async function token(app: ReturnType<typeof createApp>) {
  return (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'opportunity-student', password: 'correct password' })
  ).body.accessToken as string;
}
describe('student opportunities API', () => {
  it('denies unauthenticated catalog access', async () =>
    expect((await request(await setup()).get('/api/v1/student/opportunities')).status).toBe(401));
  it('isolates saved/application state and rejects duplicate application', async () => {
    const app = await setup(),
      accessToken = await token(app);
    expect(
      (
        await request(app)
          .post(`/api/v1/student/opportunities/${opportunityId}/apply`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .post(`/api/v1/student/opportunities/${opportunityId}/apply`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .get(`/api/v1/student/opportunities/${randomUUID()}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
  });
});
