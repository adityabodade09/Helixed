import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherClassSummaryService } from './teacher-class-summary.service.js';

const querySchema = z.object({ classId: z.string().uuid() }).strict();

export function createTeacherClassSummaryRouter(
  auth: AuthService,
  service: TeacherClassSummaryService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.get(request.principal!, parsed.data.classId));
  });
  return router;
}
