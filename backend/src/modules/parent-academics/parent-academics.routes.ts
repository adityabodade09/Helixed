import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';

const query = z.object({ childId: z.string().uuid().optional() });
const params = z.object({ childId: z.string().uuid() });

export function createParentAcademicsRouter(auth: AuthService, canonicalChildRoute = false) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  async function readAcademics(principal: AuthenticatedPrincipal, requestedChildId?: string) {
    const relationships = await prisma.parentStudentRelationship.findMany({
      where: { parentId: principal.userId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
    });
    const childId = requestedChildId ?? relationships[0]?.student.id;
    if (!childId) throw new AppError(403, 'FORBIDDEN', 'Academic access is not available.');
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: principal.userId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_academics', id: childId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Academic access is not available.');
    const [child, subjects, tasks, exams, schedule] = await Promise.all([
      prisma.user.findUnique({ where: { id: childId }, select: { displayName: true } }),
      prisma.studentSubject.findMany({
        where: { studentId: childId },
        select: { id: true, name: true, progress: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.studentTask.findMany({
        where: { studentId: childId },
        select: { id: true, title: true, dueAt: true, completedAt: true, priority: true },
        orderBy: { dueAt: 'asc' },
        take: 20,
      }),
      prisma.studentExam.findMany({
        where: { studentId: childId },
        select: { id: true, title: true, startsAt: true },
        orderBy: { startsAt: 'asc' },
        take: 10,
      }),
      prisma.studentScheduleItem.findMany({
        where: { studentId: childId },
        select: { id: true, title: true, detail: true, startsAt: true, endsAt: true },
        orderBy: { startsAt: 'asc' },
        take: 20,
      }),
    ]);
    return {
      children: relationships.map((relationship) => relationship.student),
      child: { id: childId, displayName: child?.displayName ?? 'Student' },
      subjects,
      tasks,
      exams,
      schedule,
    };
  }

  if (canonicalChildRoute) {
    router.get('/:childId/academics', async (request, response) => {
      const parsed = params.safeParse(request.params);
      if (!parsed.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      const academics = await readAcademics(request.principal!, parsed.data.childId);
      response.json({
        child: academics.child,
        subjects: academics.subjects,
        tasks: academics.tasks,
        exams: academics.exams,
        schedule: academics.schedule,
      });
    });
  } else {
    router.get('/', async (request, response) => {
      const parsed = query.safeParse(request.query);
      if (!parsed.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      response.json(await readAcademics(request.principal!, parsed.data.childId));
    });
  }
  return router;
}
