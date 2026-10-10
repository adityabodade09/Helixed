import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherMessagesService } from './teacher-messages.service.js';

const querySchema = z.object({ search: z.string().trim().max(120).optional() }).strict();
const paramsSchema = z.object({ conversationId: z.string().uuid() }).strict();
const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

export function createTeacherMessagesRouter(auth: AuthService, service: TeacherMessagesService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.list(request.principal!, parsed.data));
  });
  router.get('/:conversationId', async (request, response) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.detail(request.principal!, parsed.data.conversationId));
  });
  router.post('/:conversationId/messages', async (request, response) => {
    const parsedParams = paramsSchema.safeParse(request.params);
    const parsedBody = messageSchema.safeParse(request.body);
    if (!parsedParams.success || !parsedBody.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response
      .status(201)
      .json(
        await service.send(
          request.principal!,
          parsedParams.data.conversationId,
          parsedBody.data.body,
        ),
      );
  });
  return router;
}
