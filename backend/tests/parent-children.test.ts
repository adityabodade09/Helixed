import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent children API', () => {
  it('denies unauthenticated list and detail access', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/children')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/parent/children/10000000-0000-4000-8000-000000000001'))
        .status,
    ).toBe(401);
  });

  it('does not process malformed or forged child identifiers without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/children/not-a-uuid')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/parent/children/10000000-0000-4000-8000-000000000002'))
        .status,
    ).toBe(401);
  });

  it('keeps child profile, AI, Community, credential, session, and application data private', async () => {
    const response = await request(createApp()).get('/api/v1/parent/children');
    expect(response.status).toBe(401);
    for (const field of [
      'studentProfile',
      'aiConversations',
      'messages',
      'conversations',
      'sessions',
      'refreshTokens',
      'passwordCredential',
      'applications',
      'notes',
      'doubts',
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });
});
