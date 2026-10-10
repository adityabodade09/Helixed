import { Router } from 'express';
import { z } from 'zod';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AcademyStudentsService } from './academy-students.service.js';

const querySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    batchId: z.string().uuid().optional(),
  })
  .strict();
const paramsSchema = z.object({ studentId: z.string().uuid() }).strict();

export function createAcademyStudentsRouter(auth: AuthService, service: AcademyStudentsService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    response.json(await service.list(request.principal!, querySchema.parse(request.query)));
  });
  router.get('/:studentId', async (request, response) => {
    const { studentId } = paramsSchema.parse(request.params);
    response.json(await service.detail(request.principal!, studentId));
  });
  return router;
}
