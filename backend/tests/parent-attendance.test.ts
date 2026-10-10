import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent attendance API', () => {
  it('denies unauthenticated child attendance access', async () => {
    expect(
      (
        await request(createApp()).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/attendance',
        )
      ).status,
    ).toBe(401);
  });

  it('does not process malformed or forged child identifiers without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/children/not-a-uuid/attendance')).status).toBe(
      401,
    );
    expect(
      (
        await request(app).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000002/attendance',
        )
      ).status,
    ).toBe(401);
  });

  it('keeps attendance responses free of private and unrelated domains', async () => {
    const response = await request(createApp()).get(
      '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/attendance',
    );
    expect(response.status).toBe(401);
    for (const field of [
      'children',
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
