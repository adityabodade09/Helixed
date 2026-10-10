import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { ParentMessagesService } from './parent-messages.service.js';

const params = z.object({ conversationId: z.string().uuid() });
const message = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

export function createParentMessagesRouter(auth: AuthService, service: ParentMessagesService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) =>
    response.json(await service.list(request.principal!)),
  );
  router.get('/:conversationId', validate('params', params), async (request, response) =>
    response.json(await service.detail(request.principal!, String(request.params.conversationId))),
  );
  router.post(
    '/:conversationId/messages',
    validate('params', params),
    validate('body', message),
    async (request, response) =>
      response
        .status(201)
        .json(
          await service.send(
            request.principal!,
            String(request.params.conversationId),
            request.body.body,
          ),
        ),
  );
  return router;
}
