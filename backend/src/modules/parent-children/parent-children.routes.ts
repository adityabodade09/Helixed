import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';

const params = z.object({ childId: z.string().uuid() });

export function createParentChildrenRouter(auth: AuthService) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  async function childrenFor(principal: AuthenticatedPrincipal) {
    const relationships = await prisma.parentStudentRelationship.findMany({
      where: { parentId: principal.userId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: principal.userId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    return { children: relationships.map((relationship) => relationship.student), assignment };
  }

  async function authorizeChild(principal: AuthenticatedPrincipal, childId: string) {
    const { children, assignment } = await childrenFor(principal);
    const decision = await authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_children', id: childId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed || !children.some((child) => child.id === childId)) {
      throw new AppError(403, 'FORBIDDEN', 'Child access is not available.');
    }
    return children;
  }

  router.get('/', async (request, response) => {
    const { children, assignment } = await childrenFor(request.principal!);
    if (!assignment) throw new AppError(403, 'FORBIDDEN', 'Child access is not available.');
    const permitted = await Promise.all(
      children.map(async (child) => {
        const decision = await authorization.can(request.principal!, {
          action: 'read',
          resource: { type: 'parent_children', id: child.id },
          context: { roleAssignmentId: assignment.id },
        });
        return decision.allowed ? child : null;
      }),
    );
    response.json({
      children: permitted.filter((child): child is NonNullable<typeof child> => !!child),
    });
  });

  router.get('/:childId', async (request, response) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const children = await authorizeChild(request.principal!, parsed.data.childId);
    const childId = parsed.data.childId;
    const [tasks, activities, exams, schedule] = await Promise.all([
      prisma.studentTask.count({ where: { studentId: childId, completedAt: null } }),
      prisma.studentActivity.count({ where: { studentId: childId, status: 'ACTIVE' } }),
      prisma.studentExam.count({ where: { studentId: childId, startsAt: { gte: new Date() } } }),
      prisma.studentScheduleItem.count({
        where: { studentId: childId, startsAt: { gte: new Date() } },
      }),
    ]);
    const child = children.find((item) => item.id === childId)!;
    response.json({
      child,
      overview: {
        openTasks: tasks,
        activeActivities: activities,
        upcomingExams: exams,
        upcomingScheduleItems: schedule,
      },
    });
  });
  return router;
}
