import { Router } from 'express';
import { z } from 'zod';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { StudentDashboardService } from './student-dashboard.service.js';

const dashboardSchema = z.object({
  student: z.object({ displayName: z.string() }),
  today: z.string(),
  summary: z.object({
    classesToday: z.number().int().nonnegative(),
    tasksDue: z.number().int().nonnegative(),
    upcomingExam: z.object({ title: z.string(), startsAt: z.string() }).nullable(),
    overallProgress: z.number().int().min(0).max(100).nullable(),
  }),
  schedule: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string().nullable(),
      startsAt: z.string(),
      color: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dueAt: z.string().nullable(),
      priority: z.enum(['high', 'medium', 'low']),
    }),
  ),
  subjects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      progress: z.number().int().min(0).max(100),
      nextClassAt: z.string().nullable(),
    }),
  ),
  activities: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string().nullable(),
      occursAt: z.string().nullable(),
    }),
  ),
  announcements: z.array(z.object({ id: z.string(), title: z.string(), createdAt: z.string() })),
  opportunities: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string().nullable(),
      deadline: z.string().nullable(),
    }),
  ),
});

export function createStudentDashboardRouter(
  authService: AuthService,
  service: StudentDashboardService,
) {
  const router = Router();
  const authenticate = authenticateAccessToken((token) => authService.authenticate(token));

  router.get('/', authenticate, async (request, response) => {
    const dashboard = await service.get(request.principal!);
    response.status(200).json(dashboardSchema.parse(dashboard));
  });

  return router;
}
