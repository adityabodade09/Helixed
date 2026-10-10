import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { StudentGrowthService } from '../src/modules/student-growth/student-growth.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';
import { InMemoryStudentGrowthRepository } from './support/in-memory-student-growth.repository.js';
const userId = randomUUID();
async function setup() {
  const passwordHash = await hashPassword('correct password');
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'growth-student',
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
      permissions: ['student_growth:read'],
    },
  ];
  const repo = new InMemoryStudentGrowthRepository(userId, 'student-role', {
    studentName: 'Student',
    dimensions: [{ name: 'Academic Development', value: 75, evidence: '2 subjects' }],
    academics: { subjects: [{ id: randomUUID(), name: 'Math', progress: 75 }], taskCompletion: 50 },
    activities: [],
    patterns: { tasksCreated: 2, tasksCompleted: 1, groupMemberships: 1, activeActivities: 0 },
    achievements: [],
  });
  return createApp({
    authService: auth,
    studentGrowthService: new StudentGrowthService(repo, new AuthorizationService(authz)),
  });
}
async function token(app: ReturnType<typeof createApp>) {
  return (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'growth-student', password: 'correct password' })
  ).body.accessToken as string;
}
describe('student growth API', () => {
  it('denies unauthenticated access', async () =>
    expect((await request(await setup()).get('/api/v1/student/growth')).status).toBe(401));
  it('returns only authenticated growth evidence across all views', async () => {
    const app = await setup(),
      accessToken = await token(app);
    const response = await request(app)
      .get(`/api/v1/student/growth/academics?studentId=${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.academics.subjects[0].progress).toBe(75);
  });
});
