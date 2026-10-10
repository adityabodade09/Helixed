import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { StudentDashboardService } from '../src/modules/student-dashboard/student-dashboard.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';
import { InMemoryStudentDashboardRepository } from './support/in-memory-student-dashboard.repository.js';

const userId = randomUUID();
const dashboard = {
  student: { displayName: 'Test Student' },
  today: new Date().toISOString(),
  summary: { classesToday: 1, tasksDue: 1, upcomingExam: null, overallProgress: 80 },
  schedule: [],
  tasks: [],
  subjects: [],
  activities: [],
  announcements: [],
  opportunities: [],
};

async function setup() {
  const passwordHash = await hashPassword('correct password');
  const authService = new AuthService(
    new InMemoryAuthRepository([
      {
        id: userId,
        loginIdentifier: 'student-1',
        displayName: 'Test Student',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authorizationRepository = new InMemoryAuthorizationRepository();
  authorizationRepository.assignments = [
    {
      id: 'student-role',
      userId,
      role: 'student',
      scope: 'platform',
      schoolId: null,
      academyId: null,
      permissions: ['student_dashboard:read'],
    },
  ];
  const studentDashboardService = new StudentDashboardService(
    new InMemoryStudentDashboardRepository(userId, 'student-role', dashboard),
    new AuthorizationService(authorizationRepository),
  );
  return createApp({ authService, studentDashboardService });
}

describe('student dashboard API', () => {
  it('denies unauthenticated requests', async () => {
    const response = await request(await setup()).get('/api/v1/student/dashboard');
    expect(response.status).toBe(401);
  });

  it('returns only the authenticated student dashboard', async () => {
    const app = await setup();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'student-1', password: 'correct password' });
    const response = await request(app)
      .get('/api/v1/student/dashboard')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      student: { displayName: 'Test Student' },
      summary: { overallProgress: 80 },
    });
  });

  it('does not accept a forged student identifier', async () => {
    const app = await setup();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'student-1', password: 'correct password' });
    const response = await request(app)
      .get(`/api/v1/student/dashboard?studentId=${randomUUID()}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.student.displayName).toBe('Test Student');
  });
});
