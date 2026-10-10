import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherOpportunitiesRepository } from '../src/modules/teacher-opportunities/teacher-opportunities.repository.js';
import { TeacherOpportunitiesService } from '../src/modules/teacher-opportunities/teacher-opportunities.service.js';
import type {
  TeacherOpportunity,
  TeacherOpportunityFilters,
} from '../src/modules/teacher-opportunities/teacher-opportunities.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const opportunityId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

const opportunity: TeacherOpportunity = {
  id: opportunityId,
  title: 'Robotics Innovation Challenge 2026',
  detail: 'Build and present an original robotics project.',
  description: 'A national competition for school students.',
  category: 'Competition',
  provider: 'Indian Robotics Association',
  location: 'New Delhi',
  deadline: '2026-11-01T00:00:00.000Z',
  availability: 'OPEN',
};

class OpportunitiesRepository implements TeacherOpportunitiesRepository {
  role = true;
  queries: TeacherOpportunityFilters[] = [];
  savedQueries = 0;
  applicationQueries = 0;
  aiQueries = 0;

  async findTeacherRoleAssignment(userId: string) {
    return this.role && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async catalog(
    queriedTeacherId: string,
    queriedSchoolId: string,
    filters: TeacherOpportunityFilters,
  ) {
    if (queriedTeacherId !== teacherId || queriedSchoolId !== schoolId) return null;
    this.queries.push(filters);
    const matches =
      (!filters.search || opportunity.title.toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.category || filters.category === opportunity.category) &&
      (!filters.availability || filters.availability === opportunity.availability);
    return {
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      school: { id: schoolId, name: 'Helixed Demo School' },
      categories: ['Competition', 'Scholarship'],
      opportunities: matches ? [opportunity] : [],
    };
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_opportunities:read'],
  membership = true,
  activeRole = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  membership?: boolean;
  activeRole?: boolean;
} = {}) {
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: teacherId,
        loginIdentifier: 'teacher-demo',
        displayName: 'Neha Kapoor',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authorization = new InMemoryAuthorizationRepository();
  authorization.assignments = [
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
  if (membership) authorization.schoolMembers.add(`${teacherId}:${schoolId}`);
  const repository = new OpportunitiesRepository();
  repository.role = activeRole;
  const app = createApp({
    authService: auth,
    teacherOpportunitiesService: new TeacherOpportunitiesService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository };
}

describe('teacher opportunities API', () => {
  it('requires authentication, Teacher role, permission, verified membership, and active role', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/opportunities')).status).toBe(401);
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: [] },
      { membership: false },
      { activeRole: false },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/opportunities')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('strictly validates and applies search, category, and canonical availability filters', async () => {
    const { app, accessToken, repository } = await setup();
    for (const query of [
      '?availability=MAYBE',
      '?studentId=anything',
      `?search=${'x'.repeat(121)}`,
    ]) {
      expect(
        (
          await request(app)
            .get(`/api/v1/teacher/opportunities${query}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(400);
    }
    const response = await request(app)
      .get('/api/v1/teacher/opportunities?search=robotics&category=Competition&availability=OPEN')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.opportunities).toEqual([opportunity]);
    expect(repository.queries).toEqual([
      { search: 'robotics', category: 'Competition', availability: 'OPEN' },
    ]);
  });

  it('returns the canonical general catalog without requiring or exposing a Student context', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/opportunities')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.discovery).toEqual({
      mode: 'GENERAL',
      explanation:
        'General canonical opportunities are shown; no individualized relevance is calculated.',
    });
    expect(response.body.opportunities[0]).toMatchObject({
      id: opportunityId,
      availability: 'OPEN',
    });
    expect(response.body).not.toHaveProperty('students');
  });

  it('returns a minimized DTO without saved, application, approval, or private Student state', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/opportunities')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(Object.keys(response.body.opportunities[0]).sort()).toEqual(
      [
        'availability',
        'category',
        'deadline',
        'description',
        'detail',
        'id',
        'location',
        'provider',
        'title',
      ].sort(),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /saved|application|approval|profile|document|parent|note|essay|attachment|password|session|token|permission/i,
    );
    expect(repository.savedQueries).toBe(0);
    expect(repository.applicationQueries).toBe(0);
  });

  it('does not score, rank, predict, recommend, or invoke AI', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/opportunities')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(JSON.stringify(response.body)).not.toMatch(
      /match|fit|score|rank|percentile|prediction|acceptanceProbability|recommendedStudent|aiRecommendation/i,
    );
    expect(repository.aiQueries).toBe(0);
  });

  it('exposes no Teacher save, apply, recommend, create, edit, or delete endpoint', async () => {
    const { app, accessToken } = await setup();
    for (const [method, path] of [
      ['post', ''],
      ['post', `/${opportunityId}/apply`],
      ['post', `/${opportunityId}/save`],
      ['post', `/${opportunityId}/recommend`],
      ['patch', `/${opportunityId}`],
      ['delete', `/${opportunityId}`],
    ] as const) {
      const agent = request(app);
      expect(
        (
          await agent[method](`/api/v1/teacher/opportunities${path}`).set(
            'Authorization',
            `Bearer ${accessToken}`,
          )
        ).status,
      ).toBe(404);
    }
  });
});
