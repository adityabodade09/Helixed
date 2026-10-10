import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { ParentInsightsRepository } from '../src/modules/parent-insights/parent-insights.repository.js';
import { ParentInsightsService } from '../src/modules/parent-insights/parent-insights.service.js';
import type { ParentInsightEvidence } from '../src/modules/parent-insights/parent-insights.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const DAY = 24 * 60 * 60 * 1000;
const parentId = randomUUID();
const childId = randomUUID();
const miraId = randomUUID();
const unrelatedId = randomUUID();

const evidence = (id: string, displayName: string): ParentInsightEvidence => {
  const now = Date.now();
  return {
    child: { id, displayName },
    subjects: id === childId ? [{ id: randomUUID(), name: 'Mathematics', progress: 82 }] : [],
    tasks:
      id === childId
        ? [
            {
              id: randomUUID(),
              title: 'Completed task',
              dueAt: new Date(now - DAY),
              completedAt: new Date(now - 2 * DAY),
            },
            {
              id: randomUUID(),
              title: 'Upcoming task',
              dueAt: new Date(now + 2 * DAY),
              completedAt: null,
            },
          ]
        : [],
    attendance: id === childId ? ['PRESENT', null, 'ABSENT'] : [],
    activities:
      id === childId
        ? [
            {
              id: randomUUID(),
              title: 'Robotics Club',
              active: true,
              milestones: 2,
              completedMilestones: 1,
            },
          ]
        : [],
    certificates: id === childId ? 1 : 0,
    upcoming: {
      tasks:
        id === childId
          ? [{ id: randomUUID(), title: 'Upcoming task', at: new Date(now + 2 * DAY) }]
          : [],
      exams: [],
      schedule: [],
    },
  };
};

class InMemoryParentInsightsRepository implements ParentInsightsRepository {
  queriedChildren: string[] = [];
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
  async evidence(id: string) {
    this.queriedChildren.push(id);
    return ([childId, miraId] as string[]).includes(id)
      ? evidence(id, id === childId ? 'Aarav Sharma' : 'Mira Sharma')
      : null;
  }
}

async function setup(permissions = ['parent_insights:read']) {
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
      role: 'parent',
      scope: 'platform',
      schoolId: null,
      academyId: null,
      permissions,
    },
  ];
  authorization.parentRelationships.add(`${parentId}:${childId}`);
  authorization.parentRelationships.add(`${parentId}:${miraId}`);
  const repository = new InMemoryParentInsightsRepository();
  const app = createApp({
    authService: auth,
    parentInsightsService: new ParentInsightsService(
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

describe('parent insights API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/insights')).status).toBe(401);
  });

  it('validates selected child identifiers', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/parent/insights?childId=not-a-uuid')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(400);
  });

  it('requires explicit permission and a verified relationship', async () => {
    const missingPermission = await setup([]);
    expect(
      (
        await request(missingPermission.app)
          .get(`/api/v1/parent/insights?childId=${childId}`)
          .set('Authorization', `Bearer ${missingPermission.accessToken}`)
      ).status,
    ).toBe(403);

    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .get(`/api/v1/parent/insights?childId=${unrelatedId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(403);
  });

  it('derives factual task and attendance evidence with missing records excluded', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/insights?childId=${childId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.attendance).toMatchObject({
      scheduledSessions: 3,
      knownSessions: 2,
      missingSessions: 1,
      present: 1,
      absent: 1,
      presentRate: 50,
    });
    expect(response.body.tasks).toMatchObject({
      completed: 1,
      completedWithDeadline: 1,
      completedOnTime: 1,
      dueThisWeek: 1,
    });
    expect(response.body.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ statement: '1 of 2 known attendance records are present.' }),
      ]),
    );
  });

  it('keeps each sibling in an independent query and returns Mira sparse evidence', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/insights?childId=${miraId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.child).toEqual({ id: miraId, displayName: 'Mira Sharma' });
    expect(response.body.hasEvidence).toBe(false);
    expect(response.body.subjects).toEqual([]);
    expect(response.body.subjects).toEqual([]);
    expect(response.body.tasks.total).toBe(0);
    expect(response.body.activities.items).toEqual([]);
    expect(repository.queriedChildren).toEqual([miraId]);
  });

  it('returns a minimized DTO without private or AI-derived domains', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/insights?childId=${childId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    for (const field of [
      'aiConversation',
      'aiMessage',
      'community',
      'notes',
      'doubts',
      'password',
      'session',
      'token',
      'applicationNote',
      'permission',
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/intelligent|personality|lazy|gifted|ranking|prediction/i);
  });
});
