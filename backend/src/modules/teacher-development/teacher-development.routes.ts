import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherDevelopmentService } from './teacher-development.service.js';

const querySchema = z
  .object({ classId: z.string().uuid().optional(), studentId: z.string().uuid().optional() })
  .strict()
  .refine(({ classId, studentId }) => !studentId || !!classId);

export function createTeacherDevelopmentRouter(
  auth: AuthService,
  service: TeacherDevelopmentService,
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
