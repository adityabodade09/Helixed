import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentAiService } from './student-ai.service.js';
const id = z.object({ id: z.string().uuid() });
const body = z.object({
  prompt: z.string().trim().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});
const features = [
  'chat',
  'doubt',
  'study-plan',
  'revision',
  'daily-plan',
  'workload',
  'opportunities',
  'career',
  'documents',
  'certificates',
  'achievements',
  'insights',
];
export function createStudentAiRouter(auth: AuthService, service: StudentAiService) {
  const r = Router();
  r.use(authenticateAccessToken((t) => auth.authenticate(t)));
  r.get('/conversations', async (q, s) => s.json(await service.list(q.principal!)));
  r.get('/conversations/:id', validate('params', id), async (q, s) =>
    s.json(await service.get(q.principal!, String(q.params.id))),
  );
  for (const feature of features)
    r.post(feature === 'chat' ? '/chat' : `/${feature}`, validate('body', body), async (q, s) =>
      s
        .status(201)
        .json(await service.prompt(q.principal!, feature, q.body.prompt, q.body.conversationId)),
    );
  return r;
}
