import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { ParentDocumentsRepository } from '../src/modules/parent-documents/parent-documents.repository.js';
import { ParentDocumentsService } from '../src/modules/parent-documents/parent-documents.service.js';
import type { ParentDocument } from '../src/modules/parent-documents/parent-documents.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const parentId = randomUUID();
const childId = randomUUID();
const miraId = randomUUID();
const unrelatedId = randomUUID();

const document: ParentDocument = {
  id: randomUUID(),
  child: { id: childId, displayName: 'Aarav Sharma' },
  uploader: { displayName: 'Anita Sharma' },
  purpose: 'PARENT_PROVIDED_SUPPORTING_DOCUMENT',
  displayName: 'Parent-provided consent form record',
  fileName: 'consent-form.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 184320,
  createdAt: '2026-09-29T10:00:00.000Z',
  binaryAvailable: false,
};

class InMemoryParentDocumentsRepository implements ParentDocumentsRepository {
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
  async documents(id: string) {
    this.queriedChildren.push(id);
    if (id === childId) return [document];
    if (id === miraId) return [];
    return null;
  }
}

async function setup(
  permissions = ['parent_documents:read'],
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
  const repository = new InMemoryParentDocumentsRepository();
  const app = createApp({
    authService: auth,
    parentDocumentsService: new ParentDocumentsService(
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

describe('parent documents API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/documents')).status).toBe(401);
  });

  it('validates child identifiers and rejects unsupported query fields', async () => {
    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .get('/api/v1/parent/documents?childId=not-a-uuid')
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get(`/api/v1/parent/documents?childId=${childId}&uploaderId=${unrelatedId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
  });

  it('requires Parent role, explicit read permission, and verified relationship', async () => {
    for (const context of [await setup([]), await setup(['parent_documents:read'], 'student')]) {
      expect(
        (
          await request(context.app)
            .get(`/api/v1/parent/documents?childId=${childId}`)
            .set('Authorization', `Bearer ${context.accessToken}`)
        ).status,
      ).toBe(403);
    }
    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .get(`/api/v1/parent/documents?childId=${unrelatedId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(403);
  });

  it('returns only the selected child permitted document metadata', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/documents?childId=${childId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.child).toEqual({ id: childId, displayName: 'Aarav Sharma' });
    expect(response.body.documents).toEqual([document]);
    expect(response.body.binaryStorageAvailable).toBe(false);
  });

  it('keeps Mira empty and never falls back to a sibling document query', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/documents?childId=${miraId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.child).toEqual({ id: miraId, displayName: 'Mira Sharma' });
    expect(response.body.documents).toEqual([]);
    expect(repository.queriedChildren).toEqual([miraId]);
  });

  it('returns a narrow DTO and exposes no storage path or private Student domains', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/parent/documents?childId=${childId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(
      /storageKey|password|credential|session|token|aiConversation|communityMessage|privateNote|opportunityApplication/,
    );
    expect(Object.keys(response.body.documents[0]).sort()).toEqual(
      [
        'binaryAvailable',
        'child',
        'createdAt',
        'displayName',
        'fileName',
        'id',
        'mimeType',
        'purpose',
        'sizeBytes',
        'uploader',
      ].sort(),
    );
  });

  it('does not expose a fake upload or mutation endpoint', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .post('/api/v1/parent/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ childId, fileName: '../../unsafe.exe', uploaderId: unrelatedId });
    expect(response.status).toBe(404);
  });
});
