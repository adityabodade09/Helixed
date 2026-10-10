import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { ParentDocumentsService } from './parent-documents.service.js';

const query = z.object({ childId: z.string().uuid().optional() }).strict();

export function createParentDocumentsRouter(auth: AuthService, service: ParentDocumentsService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = query.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.get(request.principal!, parsed.data.childId));
  });
  return router;
}
