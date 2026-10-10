import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherClassesService } from './teacher-classes.service.js';

const querySchema = z.object({ search: z.string().trim().min(1).max(120).optional() }).strict();
const paramsSchema = z.object({ classId: z.string().uuid() }).strict();

export function createTeacherClassesRouter(auth: AuthService, service: TeacherClassesService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.list(request.principal!, parsed.data.search));
  });
  router.get('/:classId', async (request, response) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.detail(request.principal!, parsed.data.classId));
  });
  return router;
}
