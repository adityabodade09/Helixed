import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherOpportunitiesService } from './teacher-opportunities.service.js';

const querySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    availability: z.enum(['OPEN', 'CLOSED']).optional(),
  })
  .strict();

export function createTeacherOpportunitiesRouter(
  auth: AuthService,
  service: TeacherOpportunitiesService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.get(request.principal!, parsed.data));
  });
  return router;
}
