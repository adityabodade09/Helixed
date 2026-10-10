import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentOpportunitiesService } from './student-opportunities.service.js';
const id = z.object({ id: z.string().uuid() });
const query = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
});
const apply = z.object({ note: z.string().trim().max(1000).optional() });
export function createStudentOpportunitiesRouter(
  auth: AuthService,
  service: StudentOpportunitiesService,
) {
  const router = Router();
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  const list = async (request: Request, response: Response) => {
    const value = query.parse(request.query);
    response.json(await service.list(request.principal!, value.q, value.category));
  };
  router.get('/', validate('query', query), list);
  router.get('/recommended', validate('query', query), list);
  router.get('/saved', async (request, response) =>
    response.json((await service.list(request.principal!)).filter((item) => item.saved)),
  );
  router.get('/applied', async (request, response) =>
    response.json((await service.list(request.principal!)).filter((item) => item.application)),
  );
  router.post('/:id/save', validate('params', id), async (request, response) =>
    response.status(201).json(await service.save(request.principal!, String(request.params.id))),
  );
  router.delete('/:id/save', validate('params', id), async (request, response) => {
    await service.unsave(request.principal!, String(request.params.id));
    response.status(204).end();
  });
  router.post(
    '/:id/apply',
    validate('params', id),
    validate('body', apply),
    async (request, response) =>
      response
        .status(201)
        .json(
          await service.apply(request.principal!, String(request.params.id), request.body.note),
        ),
  );
  router.get('/:id', validate('params', id), async (request, response) =>
    response.json(await service.get(request.principal!, String(request.params.id))),
  );
  return router;
}
