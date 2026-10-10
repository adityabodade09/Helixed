import { Router } from 'express';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentGrowthService } from './student-growth.service.js';
export function createStudentGrowthRouter(auth: AuthService, service: StudentGrowthService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  for (const path of ['/', '/overview', '/academics', '/activities', '/patterns', '/achievements'])
    router.get(path, async (request, response) =>
      response.json(await service.get(request.principal!)),
    );
  return router;
}
