import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent teachers API', () => {
  it('denies unauthenticated canonical teacher access', async () => {
    expect(
      (
        await request(createApp()).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/teachers',
        )
      ).status,
    ).toBe(401);
  });

  it('does not process malformed or forged child identifiers without authentication', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/children/not-a-uuid/teachers')).status).toBe(
      401,
    );
    expect(
      (
        await request(app).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000002/teachers',
        )
      ).status,
    ).toBe(401);
  });

  it('does not expose teacher contact, credential, session, or authorization data', async () => {
    const response = await request(createApp()).get(
      '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/teachers',
    );
    expect(response.status).toBe(401);
    for (const field of [
      'loginIdentifier',
      'passwordCredential',
      'sessions',
      'refreshTokens',
      'roleAssignments',
      'permissions',
      'schoolMemberships',
      'email',
      'phone',
    ])
      expect(response.body).not.toHaveProperty(field);
  });
});
