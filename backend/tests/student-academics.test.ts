import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { StudentAcademicsService } from '../src/modules/student-academics/student-academics.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';
import { InMemoryStudentAcademicsRepository } from './support/in-memory-student-academics.repository.js';

const userId = randomUUID();
const ownTaskId = randomUUID();
const otherTaskId = randomUUID();

async function setup() {
  const passwordHash = await hashPassword('correct password');
  const authService = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'student-academics',
        displayName: 'Test Student',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authorization = new InMemoryAuthorizationRepository();
  authorization.assignments = [
    {
      id: 'student-role',
      userId,
      role: 'student',
      scope: 'platform',
      schoolId: null,
      academyId: null,
      permissions: ['student_academics:read', 'student_academics:create'],
    },
  ];
  const subjectId = '00000000-0000-4000-8000-000000000001';
  const overview = {
    student: { displayName: 'Test Student' },
    subjects: [{ id: subjectId, name: 'Mathematics', progress: 80, nextClassAt: null }],
    schedule: [],
    tasks: [],
    exams: [],
  };
  const repository = new InMemoryStudentAcademicsRepository(userId, 'student-role', overview, [
    {
      id: ownTaskId,
      title: 'Own task',
      description: 'Details',
      dueAt: null,
      priority: 'medium',
      completedAt: null,
      subject: { id: subjectId, name: 'Mathematics' },
    },
  ]);
  return createApp({
    authService,
    studentAcademicsService: new StudentAcademicsService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
}

async function token(app: ReturnType<typeof createApp>) {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'student-academics', password: 'correct password' });
  return login.body.accessToken as string;
}

describe('student academics API', () => {
  it('denies unauthenticated academic access', async () =>
    expect((await request(await setup()).get('/api/v1/student/academics')).status).toBe(401));
  it('returns academic data only for the authenticated student', async () => {
    const app = await setup();
    const accessToken = await token(app);
    const response = await request(app)
      .get(`/api/v1/student/academics?studentId=${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.student.displayName).toBe('Test Student');
  });
  it('does not expose another student task by manipulated ID', async () => {
    const app = await setup();
    const accessToken = await token(app);
    expect(
      (
        await request(app)
          .get(`/api/v1/student/academics/tasks/${otherTaskId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`/api/v1/student/academics/tasks/${ownTaskId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(200);
  });
  it('validates task IDs and doubt submissions', async () => {
    const app = await setup();
    const accessToken = await token(app);
    expect(
      (
        await request(app)
          .get('/api/v1/student/academics/tasks/not-a-uuid')
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/student/academics/doubts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ question: 'x' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/v1/student/academics/doubts')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ question: 'How do limits work?', subjectId: 'subject-1' })
      ).status,
    ).toBe(400);
  });
  it('creates a valid student-owned doubt', async () => {
    const app = await setup();
    const accessToken = await token(app);
    const response = await request(app)
      .post('/api/v1/student/academics/doubts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ question: 'How do limits work?', subjectId: '00000000-0000-4000-8000-000000000001' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ question: 'How do limits work?', state: 'open' });
  });
});
