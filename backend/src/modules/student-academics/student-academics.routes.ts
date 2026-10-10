import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation.middleware.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentAcademicsService } from './student-academics.service.js';

const taskParams = z.object({ taskId: z.string().uuid() });
const createDoubtBody = z.object({
  question: z.string().trim().min(3).max(2000),
  subjectId: z.string().uuid().optional(),
});

export function createStudentAcademicsRouter(
  authService: AuthService,
  service: StudentAcademicsService,
) {
  const router = Router();
  const authenticate = authenticateAccessToken((token) => authService.authenticate(token));
  router.use(authenticate);

  router.get('/', async (request, response) =>
    response.json(await service.getOverview(request.principal!)),
  );
  router.get('/schedule', async (request, response) =>
    response.json(await service.getSchedule(request.principal!)),
  );
  router.get('/tasks', async (request, response) =>
    response.json(await service.getTasks(request.principal!)),
  );
  router.get('/tasks/:taskId', validate('params', taskParams), async (request, response) =>
    response.json(await service.getTask(request.principal!, String(request.params.taskId))),
  );
  router.get('/class-summary', async (request, response) =>
    response.json(await service.getClassSummary(request.principal!)),
  );
  router.get('/notes', async (request, response) =>
    response.json(await service.getNotes(request.principal!)),
  );
  router.get('/exams', async (request, response) =>
    response.json(await service.getExams(request.principal!)),
  );
  router.get('/syllabus', async (request, response) =>
    response.json(await service.getSyllabus(request.principal!)),
  );
  router.get('/resources', async (request, response) =>
    response.json(await service.getResources(request.principal!)),
  );
  router.get('/doubts', async (request, response) =>
    response.json(await service.getDoubts(request.principal!)),
  );
  router.post('/doubts', validate('body', createDoubtBody), async (request, response) =>
    response.status(201).json(await service.createDoubt(request.principal!, request.body)),
  );

  return router;
}
