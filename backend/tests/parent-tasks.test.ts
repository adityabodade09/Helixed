import request from 'supertest';
import { createApp } from '../src/app.js';
import { parentTaskState, summarizeParentTasks } from '../src/modules/parent-tasks/task-summary.js';

describe('parent tasks', () => {
  it('derives factual task states without changing canonical task data', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(parentTaskState({ dueAt: new Date('2026-09-30'), completedAt: null }, now)).toBe(
      'OVERDUE',
    );
    expect(parentTaskState({ dueAt: new Date('2026-09-30'), completedAt: now }, now)).toBe(
      'COMPLETED',
    );
    expect(summarizeParentTasks([{ dueAt: null, completedAt: null }], now)).toEqual({
      total: 1,
      completed: 0,
      overdue: 0,
      upcoming: 0,
      open: 1,
    });
  });

  it('denies unauthenticated task access, including malformed and forged child IDs', async () => {
    const app = createApp();
    expect(
      (await request(app).get('/api/v1/parent/children/10000000-0000-4000-8000-000000000001/tasks'))
        .status,
    ).toBe(401);
    expect((await request(app).get('/api/v1/parent/children/not-a-uuid/tasks')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/parent/children/10000000-0000-4000-8000-000000000002/tasks'))
        .status,
    ).toBe(401);
  });

  it('does not expose private or unrelated domains from the parent task projection', async () => {
    const response = await request(createApp()).get(
      '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/tasks',
    );
    expect(response.status).toBe(401);
    for (const field of [
      'notes',
      'doubts',
      'studentProfile',
      'aiConversations',
      'messages',
      'sessions',
      'refreshTokens',
      'passwordCredential',
      'applications',
      'roleAssignments',
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });
});
