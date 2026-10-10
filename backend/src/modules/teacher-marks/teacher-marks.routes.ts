import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherMarksService } from './teacher-marks.service.js';

const querySchema = z
  .object({
    classId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(120).optional(),
  })
  .strict();
const paramsSchema = z.object({ assessmentId: z.string().uuid() }).strict();
const recordSchema = z
  .object({
    marks: z
      .array(
        z
          .object({
            studentId: z.string().uuid(),
            value: z.number().int().min(0),
            expectedMarkId: z.string().uuid().nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(({ marks }) => new Set(marks.map(({ studentId }) => studentId)).size === marks.length, {
    message: 'Student mark entries must be unique.',
    path: ['marks'],
  });

function invalid() {
  return new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
}

export function createTeacherMarksRouter(auth: AuthService, service: TeacherMarksService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw invalid();
    response.json(await service.list(request.principal!, parsed.data));
  });
  router.get('/:assessmentId', async (request, response) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) throw invalid();
    response.json(await service.detail(request.principal!, params.data.assessmentId));
  });
  router.patch('/:assessmentId', async (request, response) => {
    const params = paramsSchema.safeParse(request.params);
    const body = recordSchema.safeParse(request.body);
    if (!params.success || !body.success) throw invalid();
    response.json(
      await service.record(request.principal!, params.data.assessmentId, body.data.marks),
    );
  });
  return router;
}
