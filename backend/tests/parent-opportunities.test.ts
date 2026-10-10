import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { ParentOpportunitiesRepository } from '../src/modules/parent-opportunities/parent-opportunities.repository.js';
import { ParentOpportunitiesService } from '../src/modules/parent-opportunities/parent-opportunities.service.js';
import type {
  ParentOpportunity,
  ParentOpportunityFilters,
} from '../src/modules/parent-opportunities/parent-opportunities.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const parentId = randomUUID();
const childId = randomUUID();
const miraId = randomUUID();
const unrelatedId = randomUUID();
const opportunityId = randomUUID();

const canonicalOpportunity = (approvalPending: boolean): ParentOpportunity => ({
  id: opportunityId,
  title: 'Robotics Innovation Challenge 2026',
  detail: 'Build and present an original robotics project.',
  description: 'A national competition for school students.',
  category: 'Competition',
  provider: 'Indian Robotics Association',
  location: 'New Delhi',
  deadline: '2026-11-01T00:00:00.000Z',
  availability: 'OPEN',
  approvalPending,
});

class InMemoryParentOpportunitiesRepository implements ParentOpportunitiesRepository {
  queries: { childId: string; filters: ParentOpportunityFilters }[] = [];
  async findParentRoleAssignmentId(userId: string) {
    return userId === parentId ? 'parent-role' : null;
  }
  async children(userId: string) {
    return userId === parentId
      ? [
          { id: childId, displayName: 'Aarav Sharma' },
          { id: miraId, displayName: 'Mira Sharma' },
        ]
      : [];
  }
  async categories() {
    return ['Competition', 'Scholarship'];
  }
  async list(id: string, filters: ParentOpportunityFilters) {
    this.queries.push({ childId: id, filters });
    if (!([childId, miraId] as string[]).includes(id)) return [];
    const item = canonicalOpportunity(id === childId);
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase()))
      return [];
    if (filters.category && filters.category !== item.category) return [];
    if (filters.availability && filters.availability !== item.availability) return [];
    return [item];
  }
}

async function setup(
  permissions = ['parent_opportunities:read'],
  role: 'parent' | 'student' = 'parent',
) {
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: parentId,
        loginIdentifier: 'parent',
        displayName: 'Anita Sharma',
        accountState: 'ACTIVE',
        passwordHash: await hashPassword('correct password'),
      },
    ]),
  );
  const authorization = new InMemoryAuthorizationRepository();
  authorization.assignments = [
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
  authorization.parentRelationships.add(`${parentId}:${childId}`);
  authorization.parentRelationships.add(`${parentId}:${miraId}`);
  const repository = new InMemoryParentOpportunitiesRepository();
  const app = createApp({
    authService: auth,
    parentOpportunitiesService: new ParentOpportunitiesService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const accessToken = (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'parent', password: 'correct password' })
  ).body.accessToken as string;
  return { app, accessToken, repository };
}

describe('parent opportunities API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/opportunities')).status).toBe(401);
  });

  it('validates child and filter query parameters strictly', async () => {
    const { app, accessToken } = await setup();
    for (const query of [
      '?childId=not-a-uuid',
      `?childId=${childId}&availability=MAYBE`,
      `?childId=${childId}&studentId=${miraId}`,
    ]) {
      expect(
        (
          await request(app)
            .get(`/api/v1/parent/opportunities${query}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(400);
    }
  });

  it('requires Parent role, explicit permission, and a verified relationship', async () => {
    for (const context of [
      await setup([]),
      await setup(['parent_opportunities:read'], 'student'),
    ]) {
      expect(
        (
          await request(context.app)
            .get(`/api/v1/parent/opportunities?childId=${childId}`)
            .set('Authorization', `Bearer ${context.accessToken}`)
        ).status,
      ).toBe(403);
    }
    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .get(`/api/v1/parent/opportunities?childId=${unrelatedId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(403);
  });

  it('reuses the canonical catalog with deterministic search and filters', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(
        `/api/v1/parent/opportunities?childId=${childId}&search=robotics&category=Competition&availability=OPEN`,
      )
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.opportunities).toHaveLength(1);
    expect(response.body.opportunities[0]).toMatchObject({
      id: opportunityId,
      title: 'Robotics Innovation Challenge 2026',
      approvalPending: true,
    });
    expect(repository.queries).toEqual([
      {
        childId,
        filters: { search: 'robotics', category: 'Competition', availability: 'OPEN' },
      },
    ]);
  });

  it('requeries each sibling independently without copying Aarav application state to Mira', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/opportunities?childId=${miraId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.child).toEqual({ id: miraId, displayName: 'Mira Sharma' });
    expect(response.body.opportunities[0]).toMatchObject({
      id: opportunityId,
      approvalPending: false,
    });
    expect(repository.queries.map(({ childId: queried }) => queried)).toEqual([miraId]);
  });

  it('returns a minimized DTO without saved state or private application and Student domains', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/opportunities?childId=${childId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.body.discovery).toEqual({
      mode: 'GENERAL',
      explanation:
        'General available opportunities are shown because no approved child-relevance evidence is configured.',
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(
      /saved|applicationId|applicationNote|essay|attachment|aiConversation|community|password|credential|session|token|permission/,
    );
    expect(Object.keys(response.body.opportunities[0]).sort()).toEqual(
      [
        'approvalPending',
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
  });

  it('does not expose Parent application, save, approval-decision, or mutation endpoints', async () => {
    const { app, accessToken } = await setup();
    for (const path of [
      `/${opportunityId}/apply`,
      `/${opportunityId}/save`,
      `/${opportunityId}/approve`,
    ]) {
      expect(
        (
          await request(app)
            .post(`/api/v1/parent/opportunities${path}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ childId })
        ).status,
      ).toBe(404);
    }
  });
});
