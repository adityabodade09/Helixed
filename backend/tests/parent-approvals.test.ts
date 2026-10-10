import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { ParentApprovalsRepository } from '../src/modules/parent-approvals/parent-approvals.repository.js';
import { ParentApprovalsService } from '../src/modules/parent-approvals/parent-approvals.service.js';
import type {
  ParentApproval,
  ParentApprovalDecision,
} from '../src/modules/parent-approvals/parent-approvals.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const parentId = randomUUID();
const childId = randomUUID();
const miraId = randomUUID();
const unrelatedChildId = randomUUID();
const approvalId = randomUUID();
const unrelatedApprovalId = randomUUID();

const approval = (id: string, child: string, name: string): ParentApproval => ({
  id,
  child: { id: child, displayName: name },
  type: 'OPPORTUNITY_APPLICATION',
  target: {
    id: randomUUID(),
    opportunityId: randomUUID(),
    title: 'National Robotics Challenge',
    detail: 'Build a team prototype.',
    category: 'Competition',
    deadline: '2026-12-10T00:00:00.000Z',
  },
  status: 'PENDING',
  requestedAt: '2026-10-01T10:00:00.000Z',
  resolvedAt: null,
  targetAvailable: true,
});

class InMemoryParentApprovalsRepository implements ParentApprovalsRepository {
  items = new Map<string, ParentApproval>([
    [approvalId, approval(approvalId, childId, 'Aarav Sharma')],
    [unrelatedApprovalId, approval(unrelatedApprovalId, unrelatedChildId, 'Other Student')],
  ]);
  linkedChildren = new Set<string>([childId, miraId]);
  resolvers = new Map<string, string>();

  async findParentRoleAssignmentId(userId: string) {
    return userId === parentId ? 'parent-role' : null;
  }
  async list(userId: string) {
    return userId === parentId
      ? [...this.items.values()].filter((item) => this.linkedChildren.has(item.child.id))
      : [];
  }
  async find(id: string) {
    return this.items.get(id) ?? null;
  }
  async resolveAtomic(id: string, resolverId: string, decision: ParentApprovalDecision, now: Date) {
    const item = this.items.get(id);
    if (!item) return { kind: 'missing' } as const;
    if (item.status !== 'PENDING') return { kind: 'already-resolved' } as const;
    if (!item.targetAvailable) return { kind: 'invalid-target' } as const;
    const resolved = { ...item, status: decision, resolvedAt: now.toISOString() };
    this.items.set(id, resolved);
    this.resolvers.set(id, resolverId);
    return { kind: 'resolved', approval: resolved } as const;
  }
}

async function setup(permissions = ['parent_approvals:read', 'parent_approvals:update']) {
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
  const repository = new InMemoryParentApprovalsRepository();
  const app = createApp({
    authService: auth,
    parentApprovalsService: new ParentApprovalsService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const accessToken = (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'parent', password: 'correct password' })
  ).body.accessToken as string;
  return { app, accessToken, repository, authorization };
}

describe('parent approvals API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/approvals')).status).toBe(401);
  });

  it('lists only authorized children and returns a minimized DTO', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/parent/approvals')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: approvalId, child: { id: childId } });
    expect(JSON.stringify(response.body)).not.toMatch(
      /note|password|credential|session|token|permission|conversation/i,
    );
  });

  it('enforces independent read and decision permissions', async () => {
    const readOnly = await setup(['parent_approvals:read']);
    expect(
      (
        await request(readOnly.app)
          .get('/api/v1/parent/approvals')
          .set('Authorization', `Bearer ${readOnly.accessToken}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(readOnly.app)
          .post(`/api/v1/parent/approvals/${approvalId}/decision`)
          .set('Authorization', `Bearer ${readOnly.accessToken}`)
          .send({ decision: 'APPROVED' })
      ).status,
    ).toBe(403);

    const updateOnly = await setup(['parent_approvals:update']);
    expect(
      (
        await request(updateOnly.app)
          .get('/api/v1/parent/approvals')
          .set('Authorization', `Bearer ${updateOnly.accessToken}`)
      ).status,
    ).toBe(403);
  });

  it('rejects malformed and unrelated approval identifiers without revealing the child', async () => {
    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .post('/api/v1/parent/approvals/not-a-uuid/decision')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ decision: 'APPROVED' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/v1/parent/approvals/${unrelatedApprovalId}/decision`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ decision: 'APPROVED' })
      ).status,
    ).toBe(404);
  });

  it.each(['APPROVED', 'DECLINED'] as const)('atomically applies a %s decision', async (value) => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .post(`/api/v1/parent/approvals/${approvalId}/decision`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ decision: value });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe(value);
    expect(repository.resolvers.get(approvalId)).toBe(parentId);
    expect(response.body.target.title).toBe('National Robotics Challenge');
  });

  it('rejects repeated resolution so the first decision is preserved', async () => {
    const { app, accessToken } = await setup();
    const endpoint = `/api/v1/parent/approvals/${approvalId}/decision`;
    expect(
      (
        await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ decision: 'APPROVED' })
      ).status,
    ).toBe(200);
    const repeated = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ decision: 'DECLINED' });
    expect(repeated.status).toBe(409);
    expect(repeated.body.code).toBe('APPROVAL_ALREADY_RESOLVED');
  });

  it('rejects stale targets and strict-schema manipulation attempts', async () => {
    const { app, accessToken, repository } = await setup();
    repository.items.get(approvalId)!.targetAvailable = false;
    const endpoint = `/api/v1/parent/approvals/${approvalId}/decision`;
    const stale = await request(app)
      .post(endpoint)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ decision: 'APPROVED' });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe('APPROVAL_TARGET_UNAVAILABLE');
    expect(
      (
        await request(app)
          .post(endpoint)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ decision: 'PENDING', childId: miraId, targetId: randomUUID() })
      ).status,
    ).toBe(400);
  });
});
