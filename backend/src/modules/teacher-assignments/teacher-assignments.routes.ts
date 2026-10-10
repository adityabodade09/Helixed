import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherAssignmentsService } from './teacher-assignments.service.js';

const querySchema = z
  .object({
    classId: z.string().uuid().optional(),
    status: z
      .enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'OPEN', 'CLOSED', 'ARCHIVED', 'CANCELLED'])
      .optional(),
    search: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const createSchema = z
  .object({
    classId: z.string().uuid(),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(5000).optional(),
    subjectName: z.string().trim().min(1).max(120),
    dueAt: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
  })
  .strict();

export function createTeacherAssignmentsRouter(
  auth: AuthService,
  service: TeacherAssignmentsService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.json(await service.list(request.principal!, parsed.data));
  });
  router.post('/', async (request, response) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    response.status(201).json(await service.create(request.principal!, parsed.data));
  });
  return router;
}
