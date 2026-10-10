import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';

const loginIdentifier = 'student-1001';
const password = 'a correct test password';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(password);
});

function createTestApp() {
  const repository = new InMemoryAuthRepository([
    {
      id: randomUUID(),
      loginIdentifier,
      displayName: 'Test Student',
      accountState: 'ACTIVE',
      passwordHash,
    },
  ]);
  return createApp({ authService: new AuthService(repository) });
}

function cookieFrom(response: Response): string {
  const cookies = response.headers['set-cookie'];
  const header = Array.isArray(cookies) ? cookies[0] : cookies;
  if (!header) throw new Error('Expected a refresh-token cookie.');
  return header.split(';')[0]!;
}

async function login(app: ReturnType<typeof createTestApp>) {
  return request(app).post('/api/v1/auth/login').send({ loginIdentifier, password });
}

describe('authentication API', () => {
  it('logs in with valid credentials and sets an HttpOnly refresh cookie', async () => {
    const response = await login(createTestApp());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: { loginIdentifier, displayName: 'Test Student', accountState: 'ACTIVE' },
    });
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('returns the same generic response for invalid credentials', async () => {
    const app = createTestApp();
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier, password: 'wrong' });
    const unknownUser = await request(app)
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: 'unknown', password: 'wrong' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('rejects malformed login requests', async () => {
    const response = await request(createTestApp())
      .post('/api/v1/auth/login')
      .send({ loginIdentifier: '' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns the authenticated current user', async () => {
    const app = createTestApp();
    const loginResponse = await login(app);
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ loginIdentifier, accountState: 'ACTIVE' });
  });

  it('rejects current-user requests without a valid backend session', async () => {
    const app = createTestApp();
    const missing = await request(app).get('/api/v1/auth/me');
    const manipulated = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer frontend-state-is-not-authorization');

    expect(missing.status).toBe(401);
    expect(manipulated.status).toBe(401);
  });

  it('rotates refresh tokens and revokes the session when an old token is reused', async () => {
    const app = createTestApp();
    const loginResponse = await login(app);
    const oldCookie = cookieFrom(loginResponse);
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie);
    const rotatedCookie = cookieFrom(refreshResponse);

    expect(refreshResponse.status).toBe(200);
    expect(rotatedCookie).not.toBe(oldCookie);

    const reuseResponse = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    const revokedResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie);

    expect(reuseResponse.status).toBe(401);
    expect(revokedResponse.status).toBe(401);
  });

  it('logs out the current refresh-token session', async () => {
    const app = createTestApp();
    const loginResponse = await login(app);
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieFrom(loginResponse));
    const currentUserResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(logoutResponse.status).toBe(204);
    expect(currentUserResponse.status).toBe(401);
  });

  it('revokes all sessions belonging to the authenticated user', async () => {
    const app = createTestApp();
    const first = await login(app);
    const second = await login(app);

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${first.body.accessToken}`);
    const firstCurrent = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${first.body.accessToken}`);
    const secondCurrent = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${second.body.accessToken}`);

    expect(logoutResponse.status).toBe(204);
    expect(firstCurrent.status).toBe(401);
    expect(secondCurrent.status).toBe(401);
  });
});
