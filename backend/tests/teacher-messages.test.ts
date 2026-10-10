import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { TeacherMessagesRepository } from '../src/modules/teacher-messages/teacher-messages.repository.js';
import { TeacherMessagesService } from '../src/modules/teacher-messages/teacher-messages.service.js';
import type {
  TeacherConversationSummary,
  TeacherMessagesInbox,
  TeacherThreadMessage,
} from '../src/modules/teacher-messages/teacher-messages.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const parentConversationId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

const inbox: TeacherMessagesInbox = {
  teacher: { id: teacherId, displayName: 'Neha Kapoor' },
  school: { id: schoolId, name: 'Helixed Demo School' },
  conversations: [
    {
      id: parentConversationId,
      kind: 'DIRECT',
      title: 'Anita Sharma',
      participant: { displayName: 'Anita Sharma', role: 'PARENT' },
      contexts: ['Parent of Aarav Sharma · Grade 10A'],
      preview: 'Thank you for the update, Neha.',
      latestAt: '2026-09-30T09:35:00.000Z',
    },
  ],
};

class MessagesRepository implements TeacherMessagesRepository {
  activeRole = true;
  inboxQueries: { teacherId: string; schoolId: string }[] = [];
  privateDataQueries = 0;
  aiQueries = 0;
  inboxData = structuredClone(inbox);
  authorizedIds: Set<string> = new Set([parentConversationId]);
  messages = new Map<string, TeacherThreadMessage[]>([
    [
      parentConversationId,
      [
        {
          id: randomUUID(),
          body: 'Hello Anita, Aarav participated thoughtfully in class today.',
          createdAt: '2026-09-30T09:30:00.000Z',
          sender: { displayName: 'Neha Kapoor' },
          sentByTeacher: true,
        },
        {
          id: randomUUID(),
          body: 'Thank you for the update, Neha.',
          createdAt: '2026-09-30T09:35:00.000Z',
          sender: { displayName: 'Anita Sharma' },
          sentByTeacher: false,
        },
      ],
    ],
  ]);

  async findTeacherRoleAssignment(userId: string) {
    return this.activeRole && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async inbox(queriedTeacherId: string, queriedSchoolId: string) {
    this.inboxQueries.push({ teacherId: queriedTeacherId, schoolId: queriedSchoolId });
    return queriedTeacherId === teacherId && queriedSchoolId === schoolId ? this.inboxData : null;
  }

  async thread(queriedTeacherId: string, queriedSchoolId: string, conversationId: string) {
    const summary = this.inboxData.conversations.find(({ id }) => id === conversationId);
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      !summary ||
      !this.authorizedIds.has(conversationId)
    )
      return null;
    return {
      teacher: this.inboxData.teacher,
      school: this.inboxData.school,
      conversation: { ...summary, messages: this.messages.get(conversationId) ?? [] },
    };
  }

  async send(
    queriedTeacherId: string,
    queriedSchoolId: string,
    conversationId: string,
    body: string,
  ) {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      !this.authorizedIds.has(conversationId)
    )
      return null;
    const message = {
      id: randomUUID(),
      body,
      createdAt: new Date().toISOString(),
      sender: { displayName: 'Neha Kapoor' },
      sentByTeacher: true,
    };
    this.messages.set(conversationId, [...(this.messages.get(conversationId) ?? []), message]);
    return message;
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_messages:read', 'teacher_messages:create'],
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
  const repository = new MessagesRepository();
  repository.activeRole = activeRole;
  const app = createApp({
    authService: auth,
    teacherMessagesService: new TeacherMessagesService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository };
}

describe('teacher messages API', () => {
  it('requires authentication, Teacher role, explicit permission, verified membership, and active role', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/messages')).status).toBe(401);
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
            .get('/api/v1/teacher/messages')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('returns the canonical Parent-to-Teacher conversation once with canonical latest activity', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/messages')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.conversations).toEqual(inbox.conversations);
    expect(response.body.conversations[0]).toMatchObject({
      id: parentConversationId,
      preview: 'Thank you for the update, Neha.',
      latestAt: '2026-09-30T09:35:00.000Z',
    });
    expect(repository.inboxQueries).toEqual([{ teacherId, schoolId }]);
  });

  it('searches only the already-authorized inbox and strictly rejects unsupported filters', async () => {
    const { app, accessToken } = await setup();
    const match = await request(app)
      .get('/api/v1/teacher/messages?search=Aarav')
      .set('Authorization', `Bearer ${accessToken}`);
    const miss = await request(app)
      .get('/api/v1/teacher/messages?search=unrelated')
      .set('Authorization', `Bearer ${accessToken}`);
    const unsupported = await request(app)
      .get('/api/v1/teacher/messages?teacherId=forged')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(match.body.conversations).toHaveLength(1);
    expect(miss.body.conversations).toEqual([]);
    expect(unsupported.status).toBe(400);
  });

  it('exposes only minimized participant/context and no private or authorization data', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/messages')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(Object.keys(response.body.conversations[0]).sort()).toEqual(
      ['contexts', 'id', 'kind', 'latestAt', 'participant', 'preview', 'title'].sort(),
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /password|credential|email|phone|session|token|permission|aiConversation|profile|document|opportunityApplication|parentStudentRelationship/i,
    );
    expect(repository.privateDataQueries).toBe(0);
  });

  it('does not fabricate unread state, classify content, or invoke AI', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/messages')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(JSON.stringify(response.body)).not.toMatch(
      /unread|readReceipt|sentiment|urgency|risk|classification|summary/i,
    );
    expect(repository.aiQueries).toBe(0);
  });

  it('reads ordered canonical history only for a currently authorized conversation', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/messages/${parentConversationId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.conversation.id).toBe(parentConversationId);
    expect(response.body.conversation.messages.map(({ body }: { body: string }) => body)).toEqual([
      'Hello Anita, Aarav participated thoughtfully in class today.',
      'Thank you for the update, Neha.',
    ]);
    expect(Object.keys(response.body.conversation.messages[0]).sort()).toEqual(
      ['body', 'createdAt', 'id', 'sender', 'sentByTeacher'].sort(),
    );
    expect(repository.messages.get(parentConversationId)).toHaveLength(2);
  });

  it('supports an explicit Teacher-to-Student member thread only while its class relationship is valid', async () => {
    const studentConversation: TeacherConversationSummary = {
      id: randomUUID(),
      kind: 'DIRECT',
      title: 'Aarav Sharma',
      participant: { displayName: 'Aarav Sharma', role: 'STUDENT' },
      contexts: ['Student · Grade 10A'],
      preview: null,
      latestAt: '2026-09-30T09:40:00.000Z',
    };
    const { app, accessToken, repository } = await setup();
    repository.inboxData.conversations.push(studentConversation);
    repository.authorizedIds.add(studentConversation.id);
    expect(
      (
        await request(app)
          .get(`/api/v1/teacher/messages/${studentConversation.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(200);
    repository.authorizedIds.delete(studentConversation.id);
    expect(
      (
        await request(app)
          .get(`/api/v1/teacher/messages/${studentConversation.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(404);
  });

  it('requires read scope and safely rejects malformed, non-member, and revoked thread access', async () => {
    expect(
      (await request(createApp()).get(`/api/v1/teacher/messages/${parentConversationId}`)).status,
    ).toBe(401);
    const readDenied = await setup({ permissions: ['teacher_messages:create'] });
    expect(
      (
        await request(readDenied.app)
          .get(`/api/v1/teacher/messages/${parentConversationId}`)
          .set('Authorization', `Bearer ${readDenied.accessToken}`)
      ).status,
    ).toBe(403);
    const { app, accessToken, repository } = await setup();
    expect(
      (
        await request(app)
          .get('/api/v1/teacher/messages/not-a-uuid')
          .set('Authorization', `Bearer ${accessToken}`)
      ).status,
    ).toBe(400);
    for (const id of [randomUUID(), parentConversationId]) {
      if (id === parentConversationId) repository.authorizedIds.delete(id);
      expect(
        (
          await request(app)
            .get(`/api/v1/teacher/messages/${id}`)
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(404);
    }
  });

  it('uses separate create permission and persists exactly one canonical Teacher-authored message', async () => {
    const readOnly = await setup({ permissions: ['teacher_messages:read'] });
    expect(
      (
        await request(readOnly.app)
          .post(`/api/v1/teacher/messages/${parentConversationId}/messages`)
          .set('Authorization', `Bearer ${readOnly.accessToken}`)
          .send({ body: 'Read permission must not send.' })
      ).status,
    ).toBe(403);

    const { app, accessToken, repository } = await setup();
    const before = repository.messages.get(parentConversationId)!.length;
    const response = await request(app)
      .post(`/api/v1/teacher/messages/${parentConversationId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: '  Thanks for checking in.  ' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      body: 'Thanks for checking in.',
      sender: { displayName: 'Neha Kapoor' },
      sentByTeacher: true,
    });
    expect(repository.messages.get(parentConversationId)).toHaveLength(before + 1);
  });

  it('rejects empty, oversized, spoofed, and unauthorized sends without creating a message', async () => {
    const { app, accessToken, repository } = await setup();
    const before = repository.messages.get(parentConversationId)!.length;
    for (const payload of [
      { body: '' },
      { body: '   ' },
      { body: 'x'.repeat(2001) },
      { body: 'Spoof', senderId: randomUUID() },
    ])
      expect(
        (
          await request(app)
            .post(`/api/v1/teacher/messages/${parentConversationId}/messages`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send(payload)
        ).status,
      ).toBe(400);
    repository.authorizedIds.delete(parentConversationId);
    expect(
      (
        await request(app)
          .post(`/api/v1/teacher/messages/${parentConversationId}/messages`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ body: 'No longer authorized.' })
      ).status,
    ).toBe(404);
    expect(repository.messages.get(parentConversationId)).toHaveLength(before);
  });

  it('introduces no attachment, read-state, new-conversation, delete, or archive mutation', async () => {
    const { app, accessToken } = await setup();
    for (const [method, path] of [
      ['post', ''],
      ['post', `/${parentConversationId}/attachments`],
      ['patch', `/${parentConversationId}/read`],
      ['patch', `/${parentConversationId}`],
      ['delete', `/${parentConversationId}`],
    ] as const) {
      const agent = request(app);
      expect(
        (
          await agent[method](`/api/v1/teacher/messages${path}`).set(
            'Authorization',
            `Bearer ${accessToken}`,
          )
        ).status,
      ).toBe(404);
    }
  });
});
