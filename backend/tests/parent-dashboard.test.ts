import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent dashboard API', () => {
  it('denies unauthenticated access', async () => {
    expect((await request(createApp()).get('/api/v1/parent')).status).toBe(401);
  });
  it('does not process malformed or forged child selections without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent?childId=not-a-uuid')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/parent?childId=10000000-0000-4000-8000-000000000002'))
        .status,
    ).toBe(401);
  });
  it('keeps private dashboard domains behind authenticated relationship policy', async () => {
    const response = await request(createApp()).get('/api/v1/parent');
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('sessions');
    expect(response.body).not.toHaveProperty('refreshTokens');
    expect(response.body).not.toHaveProperty('passwordCredential');
    expect(response.body).not.toHaveProperty('messages');
    expect(response.body).not.toHaveProperty('conversations');
    expect(response.body).not.toHaveProperty('applications');
  });
});
