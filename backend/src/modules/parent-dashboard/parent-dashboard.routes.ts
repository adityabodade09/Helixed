import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';
const query = z.object({ childId: z.string().uuid().optional() });
export function createParentDashboardRouter(auth: AuthService) {
  const router = Router(),
    authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));
  router.get('/', async (request, response) => {
    const parsed = query.safeParse(request.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const parentId = request.principal!.userId;
    const children = await prisma.parentStudentRelationship.findMany({
      where: { parentId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
    });
    if (!children.length)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access a child dashboard.');
    const childId = parsed.data.childId ?? children[0]!.student.id;
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: parentId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(request.principal!, {
      action: 'read',
      resource: { type: 'parent_dashboard', id: childId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(
        403,
        'FORBIDDEN',
        'You are not authorized to access this child dashboard.',
      );
    const [student, subjects, tasks, schedule, activities] = await Promise.all([
      prisma.user.findUnique({ where: { id: childId }, select: { displayName: true } }),
      prisma.studentSubject.findMany({
        where: { studentId: childId },
        select: { id: true, name: true, progress: true },
        take: 6,
      }),
      prisma.studentTask.findMany({
        where: { studentId: childId, completedAt: null },
        select: { id: true, title: true, dueAt: true, priority: true },
        take: 6,
      }),
      prisma.studentScheduleItem.findMany({
        where: { studentId: childId, startsAt: { gte: new Date() } },
        select: { id: true, title: true, startsAt: true, detail: true },
        orderBy: { startsAt: 'asc' },
        take: 5,
      }),
      prisma.studentActivity.findMany({
        where: { studentId: childId },
        select: { id: true, title: true, category: true },
        take: 5,
      }),
    ]);
    response.json({
      children: children.map((x) => x.student),
      child: { id: childId, displayName: student?.displayName ?? 'Student' },
      subjects,
      tasks,
      schedule,
      activities,
    });
  });
  return router;
}
