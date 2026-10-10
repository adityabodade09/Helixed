import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { ParentOpportunitiesService } from './parent-opportunities.service.js';

const query = z
  .object({
    childId: z.string().uuid().optional(),
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    availability: z.enum(['OPEN', 'CLOSED']).optional(),
  })
  .strict();

export function createParentOpportunitiesRouter(
  auth: AuthService,
  service: ParentOpportunitiesService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = query.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const value = parsed.data;
    response.json(
      await service.get(request.principal!, value.childId, {
        search: value.search,
        category: value.category,
        availability: value.availability,
      }),
    );
  });
  return router;
}
