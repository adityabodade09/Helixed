import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { TeacherAttendanceService } from './teacher-attendance.service.js';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  });
const querySchema = z
  .object({
    classId: z.string().uuid().optional(),
    date: isoDate.optional(),
    state: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  })
  .strict();
const paramsSchema = z.object({ sessionId: z.string().uuid() }).strict();
const recordSchema = z
  .object({
    records: z
      .array(
        z
          .object({
            studentId: z.string().uuid(),
            state: z.enum(['PRESENT', 'ABSENT', 'LATE', 'PARTIAL']),
            expectedRecordId: z.string().uuid().nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    ({ records }) => new Set(records.map(({ studentId }) => studentId)).size === records.length,
    { message: 'Student attendance entries must be unique.', path: ['records'] },
  );

function invalid() {
  return new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
}

export function createTeacherAttendanceRouter(
  auth: AuthService,
  service: TeacherAttendanceService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw invalid();
    response.json(await service.list(request.principal!, parsed.data));
  });
  router.get('/:sessionId', async (request, response) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) throw invalid();
    response.json(await service.detail(request.principal!, params.data.sessionId));
  });
  router.patch('/:sessionId', async (request, response) => {
    const params = paramsSchema.safeParse(request.params);
    const body = recordSchema.safeParse(request.body);
    if (!params.success || !body.success) throw invalid();
    response.json(
      await service.record(request.principal!, params.data.sessionId, body.data.records),
    );
  });
  return router;
}
