import request from 'supertest';
import { createApp } from '../src/app.js';
import { DevelopmentAiProvider } from '../src/modules/student-ai/ai-provider.js';

describe('student AI safety foundation', () => {
  it('denies unauthenticated conversation access', async () => {
    const response = await request(createApp()).get('/api/v1/student/ai/conversations');
    expect(response.status).toBe(401);
  });

  it('returns development-only guidance without performing a canonical action', async () => {
    const response = await new DevelopmentAiProvider().respond({
      feature: 'study-plan',
      prompt: 'Make a plan for my physics revision',
      context: { subjectNames: ['Physics'] },
    });
    expect(response).toContain('Physics');
    expect(response).toContain('guidance only; no records were changed');
  });
});
