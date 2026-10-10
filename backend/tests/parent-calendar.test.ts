import request from 'supertest';
import { createApp } from '../src/app.js';

describe('parent calendar API', () => {
  it('denies unauthenticated calendar access', async () => {
    const app = createApp();
    expect((await request(app).get('/api/v1/parent/calendar')).status).toBe(401);
    expect(
      (
        await request(app).get(
          '/api/v1/parent/children/10000000-0000-4000-8000-000000000001/calendar?from=2026-01-01&to=2026-01-08',
        )
      ).status,
    ).toBe(401);
  });

  it('does not process malformed ranges or forged child IDs without authentication', async () => {
    const app = createApp();
    expect(
      (await request(app).get('/api/v1/parent/calendar?from=invalid&to=also-invalid')).status,
    ).toBe(401);
    expect(
      (
        await request(app).get(
          '/api/v1/parent/children/not-a-uuid/calendar?from=2026-01-01&to=2026-01-08',
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app).get(
          '/api/v1/parent/calendar?childId=10000000-0000-4000-8000-000000000002&from=2026-01-01&to=2026-01-08',
        )
      ).status,
    ).toBe(401);
  });

  it('keeps malformed event IDs and private calendar-adjacent domains behind authorization', async () => {
    const response = await request(createApp()).get(
      '/api/v1/parent/calendar/event/not-a-canonical-id',
    );
    expect(response.status).toBe(401);
    for (const field of [
      'sessions',
      'refreshTokens',
      'passwordCredential',
      'messages',
      'conversations',
      'notes',
      'doubts',
      'applications',
    ]) {
      expect(response.body).not.toHaveProperty(field);
    }
  });
});
