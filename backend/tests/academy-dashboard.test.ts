import { randomUUID } from 'node:crypto';
import { beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { AcademyDashboardRepository } from '../src/modules/academy-dashboard/academy-dashboard.repository.js';
import { AcademyDashboardService } from '../src/modules/academy-dashboard/academy-dashboard.service.js';
import type { AcademyDashboardRecord } from '../src/modules/academy-dashboard/academy-dashboard.types.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { Role } from '../src/modules/authorization/authorization.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const userId = randomUUID();
const academyId = randomUUID();
const batchId = randomUUID();
const studentId = randomUUID();
const secondStudentId = randomUUID();
const coachId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class DashboardRepository implements AcademyDashboardRepository {
  roleAssignment = true;
  queriedAcademies: string[] = [];
  record: AcademyDashboardRecord = {
    academy: { id: academyId, name: 'Helixed Skills Academy' },
    enrolledStudentIds: [studentId, studentId, secondStudentId],
    batches: [
      {
        id: batchId,
        name: 'Robotics Foundations',
        studentIds: [studentId, studentId],
        coachIds: [coachId, coachId],
      },
      {
        id: randomUUID(),
        name: 'Creative Computing',
        studentIds: [secondStudentId],
        coachIds: [coachId],
      },
    ],
  };

  async findRoleAssignment(queriedUserId: string) {
    return this.roleAssignment && queriedUserId === userId
      ? { id: 'academy-role', academyId }
      : null;
  }

  async dashboard(queriedAcademyId: string) {
    this.queriedAcademies.push(queriedAcademyId);
    return this.record;
  }
}

async function setup({
  role = 'academy_admin',
  permissions = ['academy_dashboard:read'],
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
  if (resource) authorization.academyResources.add(`${academyId}:academy_dashboard:${academyId}`);

  const repository = new DashboardRepository();
  repository.roleAssignment = role === 'academy_owner' || role === 'academy_admin';
  const app = createApp({
    authService: auth,
    academyDashboardService: new AcademyDashboardService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'academy-demo', password: 'correct password' });
  return { app, token: login.body.accessToken as string, repository };
}

describe('academy dashboard API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/academy')).status).toBe(401);
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
        (await request(app).get('/api/v1/academy').set('Authorization', `Bearer ${token}`)).status,
      ).toBe(403);
    }
  });

  it('derives factual counts from only the authenticated Academy scope', async () => {
    const { app, token, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/academy')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(repository.queriedAcademies).toEqual([academyId]);
    expect(response.body).toEqual({
      academy: { id: academyId, name: 'Helixed Skills Academy' },
      summary: { enrolledStudents: 2, batches: 2, assignedCoaches: 1 },
      batches: [
        { id: batchId, name: 'Robotics Foundations', studentCount: 1, coachCount: 1 },
        {
          id: expect.any(String),
          name: 'Creative Computing',
          studentCount: 1,
          coachCount: 1,
        },
      ],
    });
  });

  it('returns a narrow Academy-only DTO and rejects client-selected scope', async () => {
    const { app, token } = await setup();
    const response = await request(app)
      .get('/api/v1/academy')
      .set('Authorization', `Bearer ${token}`);
    expect(JSON.stringify(response.body)).not.toMatch(
      /studentId|coachId|mark|attendance|password|token|session|permission|roleAssignment|parent|AI|rank|score|prediction/i,
    );
    expect(
      (
        await request(app)
          .get(`/api/v1/academy?academyId=${randomUUID()}`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(400);
  });

  it('supports a verified Academy Owner and a factual empty dashboard', async () => {
    const { app, token, repository } = await setup({ role: 'academy_owner' });
    repository.record = {
      academy: { id: academyId, name: 'Empty Academy' },
      enrolledStudentIds: [],
      batches: [],
    };
    const response = await request(app)
      .get('/api/v1/academy')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual({ enrolledStudents: 0, batches: 0, assignedCoaches: 0 });
    expect(response.body.batches).toEqual([]);
  });
});
