import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { ParentApprovalsService } from './parent-approvals.service.js';

const params = z.object({ approvalId: z.string().uuid() }).strict();
const decision = z.object({ decision: z.enum(['APPROVED', 'DECLINED']) }).strict();

export function createParentApprovalsRouter(auth: AuthService, service: ParentApprovalsService) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) =>
    response.json(await service.list(request.principal!)),
  );
  router.post(
    '/:approvalId/decision',
    validate('params', params),
    validate('body', decision),
    async (request, response) =>
      response.json(
        await service.decide(
          request.principal!,
          String(request.params.approvalId),
          request.body.decision,
        ),
      ),
  );
  return router;
}
