import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent child academics API', () => {
  it('denies unauthenticated canonical child academics access', async () => {
    expect(
      (
        await request(createApp()).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/academics',
        )
      ).status,
    ).toBe(401);
  });

  it('does not process malformed or forged child identifiers without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/children/not-a-uuid/academics')).status).toBe(
      401,
    );
    expect(
      (
        await request(app).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000002/academics',
        )
      ).status,
    ).toBe(401);
  });

  it('keeps the canonical academic projection free of sibling and private domains', async () => {
    const response = await request(createApp()).get(
      '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/academics',
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
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });
});
