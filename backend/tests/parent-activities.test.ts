import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent activities API', () => {
  it('denies unauthenticated activity requests', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/activities')).status).toBe(401);
    expect(
      (
        await request(app).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/activities',
        )
      ).status,
    ).toBe(401);
  });

  it('does not process malformed or forged child selections without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/activities?childId=not-a-uuid')).status).toBe(
      401,
    );
    expect(
      (
        await request(app).get(
          '/api/v1/parent/activities?childId=10000000-0000-4000-8000-000000000002',
        )
      ).status,
    ).toBe(401);
    expect((await request(app).get('/api/v1/parent/children/not-a-uuid/activities')).status).toBe(
      401,
    );
  });

  it('does not disclose activity, credential, session, or unrelated private data without access', async () => {
    const response = await request(createApp()).get('/api/v1/parent/activities');
    expect(response.status).toBe(401);
    for (const field of [
      'description',
      'sessions',
      'refreshTokens',
      'passwordCredential',
      'messages',
      'conversations',
      'applications',
      'profile',
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });
});
