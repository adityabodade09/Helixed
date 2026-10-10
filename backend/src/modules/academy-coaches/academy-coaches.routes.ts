import { Router } from 'express';
import { z } from 'zod';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AcademyCoachesService } from './academy-coaches.service.js';

const querySchema = z.object({ search: z.string().trim().max(100).optional() }).strict();

export function createAcademyCoachesRouter(auth: AuthService, service: AcademyCoachesService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    response.json(await service.list(request.principal!, querySchema.parse(request.query)));
  });
  return router;
}
