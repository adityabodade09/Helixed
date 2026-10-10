import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentActivitiesService } from './student-activities.service.js';

const activityParams = z.object({ activityId: z.string().uuid() });
const createActivity = z.object({
  title: z.string().trim().min(2).max(240),
  category: z.enum([
    'Sports',
    'Creative',
    'Technology',
    'Communication',
    'Leadership & Community',
    'Other',
  ]),
  startedAt: z.coerce.date(),
  organization: z.string().trim().max(240).optional(),
  description: z.string().trim().max(4000).optional(),
});
export function createStudentActivitiesRouter(
  authService: AuthService,
  service: StudentActivitiesService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => authService.authenticate(token)));
  router.get('/', async (request, response) =>
    response.json(await service.list(request.principal!)),
  );
  router.get('/certificates', async (request, response) =>
    response.json(await service.certificates(request.principal!)),
  );
  router.post('/', validate('body', createActivity), async (request, response) =>
    response.status(201).json(await service.create(request.principal!, request.body)),
  );
  router.get(
    '/:activityId/progress',
    validate('params', activityParams),
    async (request, response) =>
      response.json(await service.progress(request.principal!, String(request.params.activityId))),
  );
  router.get('/:activityId', validate('params', activityParams), async (request, response) =>
    response.json(await service.get(request.principal!, String(request.params.activityId))),
  );
  return router;
}
