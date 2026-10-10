import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('reports API availability without requiring authentication', async () => {
    const response = await request(createApp()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'helixed-api',
      environment: 'test',
    });
    expect(response.headers['x-request-id']).toBeTruthy();
  });
});
