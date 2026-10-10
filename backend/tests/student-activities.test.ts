import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { StudentActivitiesService } from '../src/modules/student-activities/student-activities.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';
import { InMemoryStudentActivitiesRepository } from './support/in-memory-student-activities.repository.js';

const userId = randomUUID();
const activityId = randomUUID();
const otherId = randomUUID();
async function setup() {
  const passwordHash = await hashPassword('correct password');
  const authService = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'activity-student',
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
      permissions: ['student_activities:read', 'student_activities:create'],
    },
  ];
  const repository = new InMemoryStudentActivitiesRepository(userId, 'student-role', [
    {
      id: activityId,
      title: 'Football',
      category: 'Sports',
      status: 'active',
      startedAt: null,
      organization: null,
      description: null,
    },
  ]);
  return createApp({
    authService,
    studentActivitiesService: new StudentActivitiesService(
      repository,
      new AuthorizationService(authz),
    ),
  });
}
async function token(app: ReturnType<typeof createApp>) {
  return (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'activity-student', password: 'correct password' })
  ).body.accessToken as string;
}
describe('student activities API', () => {
  it('denies unauthenticated access', async () =>
    expect((await request(await setup()).get('/api/v1/student/activities')).status).toBe(401));
  it('returns only own activities and denies foreign identifiers', async () => {
    const app = await setup();
    const accessToken = await token(app);
    expect(
      (
        await request(app)
          .get(`/api/v1/student/activities?studentId=${randomUUID()}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body[0].title,
    ).toBe('Football');
    expect(
      (
        await request(app)
          .get(`/api/v1/student/activities/${otherId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
  });
  it('validates and creates a permitted activity', async () => {
    const app = await setup();
    const accessToken = await token(app);
    expect(
      (
        await request(app)
          .post('/api/v1/student/activities')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ title: 'x' })
      ).status,
    ).toBe(400);
    const response = await request(app)
      .post('/api/v1/student/activities')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Robotics', category: 'Technology', startedAt: '2026-09-01' });
    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Robotics');
  });
});
