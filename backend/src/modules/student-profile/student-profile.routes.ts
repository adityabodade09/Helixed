import { Router } from 'express';
import { z } from 'zod';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import { validate } from '../../middleware/validation.middleware.js';
import type { StudentProfileService } from './student-profile.service.js';
const update = z
  .object({
    bio: z.string().trim().max(1000).nullable().optional(),
    interests: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .strict();
export function createStudentProfileRouter(auth: AuthService, service: StudentProfileService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) =>
    response.json(await service.get(request.principal!)),
  );
  router.patch('/', validate('body', update), async (request, response) =>
    response.json(await service.update(request.principal!, request.body)),
  );
  return router;
}
