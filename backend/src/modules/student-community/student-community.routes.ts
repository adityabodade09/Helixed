import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentCommunityService } from './student-community.service.js';

const id = z.object({ id: z.string().uuid() });
const message = z.object({ body: z.string().trim().min(1).max(2000) });
export function createStudentCommunityRouter(auth: AuthService, service: StudentCommunityService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) =>
    response.json(await service.inbox(request.principal!)),
  );
  router.get('/inbox', async (request, response) =>
    response.json(await service.inbox(request.principal!)),
  );
  router.get('/sent', async (request, response) =>
    response.json(await service.sent(request.principal!)),
  );
  router.get('/groups', async (request, response) =>
    response.json(await service.groups(request.principal!)),
  );
  router.post('/groups/:id/join', validate('params', id), async (request, response) =>
    response.status(201).json(await service.join(request.principal!, String(request.params.id))),
  );
  router.get('/groups/:id', validate('params', id), async (request, response) =>
    response.json(await service.group(request.principal!, String(request.params.id))),
  );
  router.get('/direct', async (request, response) =>
    response.json(await service.inbox(request.principal!, 'direct')),
  );
  router.get('/direct/:id', validate('params', id), async (request, response) =>
    response.json(await service.direct(request.principal!, String(request.params.id))),
  );
  router.post(
    '/conversations/:id/messages',
    validate('params', id),
    validate('body', message),
    async (request, response) =>
      response
        .status(201)
        .json(await service.send(request.principal!, String(request.params.id), request.body.body)),
  );
  return router;
}
