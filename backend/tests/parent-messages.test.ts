import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { ParentMessagesRepository } from '../src/modules/parent-messages/parent-messages.repository.js';
import { ParentMessagesService } from '../src/modules/parent-messages/parent-messages.service.js';
import type { DirectConversationDetail } from '../src/modules/parent-messages/parent-messages.types.js';
import type { ParentTeacherContext } from '../src/modules/parent-teachers/parent-teacher-context.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const parentId = randomUUID();
const teacherId = randomUUID();
const childId = randomUUID();
const miraId = randomUUID();
const conversationId = randomUUID();
const unrelatedConversationId = randomUUID();
const privateStudentConversationId = randomUUID();

class InMemoryParentMessagesRepository implements ParentMessagesRepository {
  contexts: ParentTeacherContext[] = [
    {
      teacherId,
      teacherName: 'Neha Kapoor',
      childId,
      childName: 'Aarav Sharma',
      className: 'Class 12',
      schoolName: 'Helixed Demo School',
    },
  ];
  conversationsById = new Map<string, DirectConversationDetail>([
    [
      conversationId,
      {
        id: conversationId,
        peerId: teacherId,
        peerName: 'Neha Kapoor',
        preview: 'Class update',
        updatedAt: '2026-10-01T10:00:00.000Z',
        messages: [],
      },
    ],
    [
      unrelatedConversationId,
      {
        id: unrelatedConversationId,
        peerId: randomUUID(),
        peerName: 'Unrelated teacher',
        preview: 'Hidden',
        updatedAt: '2026-10-01T10:00:00.000Z',
        messages: [],
      },
    ],
    [
      privateStudentConversationId,
      {
        id: privateStudentConversationId,
        peerId: childId,
        peerName: 'Aarav Sharma',
        preview: 'Private student message',
        updatedAt: '2026-10-01T10:00:00.000Z',
        messages: [],
      },
    ],
  ]);
  async findParentRoleAssignmentId(userId: string) {
    return userId === parentId ? 'parent-role' : null;
  }
  async teacherContexts(userId: string) {
    return userId === parentId ? this.contexts : [];
  }
  async conversations(userId: string) {
    return userId === parentId
      ? [...this.conversationsById.values()].map(({ messages: _messages, ...summary }) => summary)
      : [];
  }
  async conversation(userId: string, id: string) {
    return userId === parentId ? (this.conversationsById.get(id) ?? null) : null;
  }
  async send(userId: string, id: string, body: string) {
    const conversation = this.conversationsById.get(id);
    if (userId !== parentId || !conversation) return null;
    const message = {
      id: randomUUID(),
      body,
      createdAt: new Date().toISOString(),
      sender: { id: userId, displayName: 'Anita Sharma' },
    };
    conversation.messages.push(message);
    return message;
  }
}

async function setup(permissions = ['parent_messages:read', 'parent_messages:create']) {
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
  const repository = new InMemoryParentMessagesRepository();
  const app = createApp({
    authService: auth,
    parentMessagesService: new ParentMessagesService(
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

describe('parent messages API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/messages')).status).toBe(401);
  });

  it('lists only current Parent-to-authorized-teacher conversations', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/parent/messages')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: conversationId,
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      contexts: [{ childId, childName: 'Aarav Sharma' }],
    });
    expect(JSON.stringify(response.body)).not.toContain('Private student message');
    expect(JSON.stringify(response.body)).not.toContain(miraId);
  });

  it('denies malformed, forged, and unrelated conversation identifiers', async () => {
    const { app, accessToken } = await setup();
    expect(
      (
        await request(app)
          .get('/api/v1/parent/messages/not-a-uuid')
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
    for (const id of [randomUUID(), unrelatedConversationId, privateStudentConversationId])
      expect(
        (
          await request(app)
            .get(`/api/v1/parent/messages/${id}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(404);
  });

  it('enforces separate read and create permissions', async () => {
    const { app, accessToken } = await setup(['parent_messages:read']);
    expect(
      (
        await request(app)
          .get(`/api/v1/parent/messages/${conversationId}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(`/api/v1/parent/messages/${conversationId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: 'Hello' })
      ).status,
    ).toBe(403);
  });

  it('validates message bodies and derives the sender from authentication', async () => {
    const { app, accessToken } = await setup();
    for (const body of ['', 'x'.repeat(2001)])
      expect(
        (
          await request(app)
            .post(`/api/v1/parent/messages/${conversationId}/messages`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ body })
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/v1/parent/messages/${conversationId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: 'Hello', senderId: teacherId })
      ).status,
    ).toBe(400);
    const sent = await request(app)
      .post(`/api/v1/parent/messages/${conversationId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: 'Hello' });
    expect(sent.status).toBe(201);
    expect(sent.body.sender).toEqual({ id: parentId, displayName: 'Anita Sharma' });
    expect(sent.body).not.toHaveProperty('credentials');
    expect(sent.body).not.toHaveProperty('permissions');
  });

  it('revalidates the current teacher relationship before sending', async () => {
    const { app, accessToken, repository } = await setup();
    repository.contexts = [];
    expect(
      (
        await request(app)
          .post(`/api/v1/parent/messages/${conversationId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: 'This must not send' })
      ).status,
    ).toBe(404);
  });
});
