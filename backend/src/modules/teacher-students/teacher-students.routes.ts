import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherStudentsService } from './teacher-students.service.js';

const querySchema = z
  .object({
    search: z.string().trim().min(1).max(120).optional(),
    classId: z.string().uuid().optional(),
  })
  .strict();
const paramsSchema = z.object({ studentId: z.string().uuid() });

export function createTeacherStudentsRouter(auth: AuthService, service: TeacherStudentsService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.list(request.principal!, parsed.data));
  });
  router.get('/:studentId', async (request, response) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.detail(request.principal!, parsed.data.studentId));
  });
  return router;
}
