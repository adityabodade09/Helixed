import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentCalendarService } from './student-calendar.service.js';
const query = z
  .object({ from: z.coerce.date(), to: z.coerce.date() })
  .refine(
    (value) => value.to > value.from && value.to.getTime() - value.from.getTime() <= 370 * 86400000,
    'Invalid date range',
  );
const params = z.object({ id: z.string().min(3).max(200) });
export function createStudentCalendarRouter(auth: AuthService, service: StudentCalendarService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', validate('query', query), async (request, response) => {
    const range = query.parse(request.query);
    response.json(await service.list(request.principal!, range.from, range.to));
  });
  router.get('/event/:id', validate('params', params), async (request, response) =>
    response.json(await service.get(request.principal!, String(request.params.id))),
  );
  return router;
}
