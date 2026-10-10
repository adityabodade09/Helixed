import { Router } from 'express';
import { z } from 'zod';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AcademyBatchesService } from './academy-batches.service.js';

const querySchema = z.object({ search: z.string().trim().max(100).optional() }).strict();
const paramsSchema = z.object({ batchId: z.string().uuid() }).strict();

export function createAcademyBatchesRouter(auth: AuthService, service: AcademyBatchesService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    response.json(await service.list(request.principal!, querySchema.parse(request.query)));
  });
  router.get('/:batchId', async (request, response) => {
    const { batchId } = paramsSchema.parse(request.params);
    response.json(await service.detail(request.principal!, batchId));
  });
  return router;
}
