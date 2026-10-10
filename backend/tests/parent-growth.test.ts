import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent growth API', () => {
  it('denies unauthenticated growth access', async () => {
    expect((await request(createApp()).get('/api/v1/parent/growth')).status).toBe(401);
  });

  it('does not process malformed or forged child selections without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/growth?childId=not-a-uuid')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/parent/growth?childId=10000000-0000-4000-8000-000000000002'))
        .status,
    ).toBe(401);
  });

  it('keeps private and non-parent-visible growth sources behind authorization', async () => {
    const response = await request(createApp()).get('/api/v1/parent/growth');
    expect(response.status).toBe(401);
    for (const field of [
      'community',
      'messages',
      'conversations',
      'notes',
      'doubts',
      'sessions',
      'refreshTokens',
      'passwordCredential',
      'applications',
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });
});
