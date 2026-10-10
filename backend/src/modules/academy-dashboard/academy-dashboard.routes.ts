import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AcademyDashboardService } from './academy-dashboard.service.js';

export function createAcademyDashboardRouter(auth: AuthService, service: AcademyDashboardService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    if (!z.object({}).strict().safeParse(request.query).success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.get(request.principal!));
  });
  return router;
}
