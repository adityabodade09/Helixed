import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';
import { parentTaskState, summarizeParentTasks } from './task-summary.js';

const params = z.object({ childId: z.string().uuid() });

export function createParentTasksRouter(auth: AuthService) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  router.get('/:childId/tasks', async (request, response) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const childId = parsed.data.childId;
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: request.principal!.userId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(request.principal!, {
      action: 'read',
      resource: { type: 'parent_tasks', id: childId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed) throw new AppError(403, 'FORBIDDEN', 'Task access is not available.');

    const now = new Date();
    const [child, tasks] = await Promise.all([
      prisma.user.findUnique({ where: { id: childId }, select: { id: true, displayName: true } }),
      prisma.studentTask.findMany({
        where: { studentId: childId },
        select: {
          id: true,
          title: true,
          dueAt: true,
          completedAt: true,
          priority: true,
          subject: { select: { name: true } },
        },
        orderBy: [{ completedAt: 'asc' }, { dueAt: 'asc' }],
        take: 100,
      }),
    ]);
    if (!child) throw new AppError(403, 'FORBIDDEN', 'Task access is not available.');
    response.json({
      child,
      summary: summarizeParentTasks(tasks, now),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        subject: task.subject?.name ?? null,
        dueAt: task.dueAt,
        priority: task.priority,
        completedAt: task.completedAt,
        state: parentTaskState(task, now),
      })),
    });
  });
  return router;
}
