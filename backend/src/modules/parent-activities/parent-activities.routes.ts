import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';

const childQuery = z.object({ childId: z.string().uuid().optional() });
const childParams = z.object({ childId: z.string().uuid() });
const activityParams = z.object({ activityId: z.string().uuid() });

export function createParentActivitiesRouter(auth: AuthService, canonicalChildRoute = false) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  async function authorizeChild(principal: AuthenticatedPrincipal, childId?: string) {
    const parentId = principal.userId;
    const relationships = await prisma.parentStudentRelationship.findMany({
      where: { parentId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
    });
    const selectedChildId = childId ?? relationships[0]?.student.id;
    if (!selectedChildId) throw new AppError(403, 'FORBIDDEN', 'Activity access is not available.');

    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: parentId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_activities', id: selectedChildId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Activity access is not available.');
    return { children: relationships.map((relationship) => relationship.student), selectedChildId };
  }

  async function readActivities(principal: AuthenticatedPrincipal, childId?: string) {
    const { children, selectedChildId } = await authorizeChild(principal, childId);
    const [child, activities, certificates] = await Promise.all([
      prisma.user.findUnique({ where: { id: selectedChildId }, select: { displayName: true } }),
      prisma.studentActivity.findMany({
        where: { studentId: selectedChildId },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          startedAt: true,
          occursAt: true,
          organization: true,
          _count: { select: { progressEntries: true, milestones: true, certificates: true } },
        },
        orderBy: [{ status: 'asc' }, { startedAt: 'asc' }],
      }),
      prisma.studentActivityCertificate.findMany({
        where: { studentId: selectedChildId },
        select: { id: true, title: true, issuer: true, issuedAt: true, state: true },
        orderBy: { issuedAt: 'desc' },
        take: 5,
      }),
    ]);
    return {
      children,
      child: { id: selectedChildId, displayName: child?.displayName ?? 'Student' },
      activities,
      certificates,
    };
  }

  if (canonicalChildRoute) {
    router.get('/:childId/activities', async (request, response) => {
      const parsed = childParams.safeParse(request.params);
      if (!parsed.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      const activities = await readActivities(request.principal!, parsed.data.childId);
      response.json({
        child: activities.child,
        activities: activities.activities,
        certificates: activities.certificates,
      });
    });
  } else {
    router.get('/', async (request, response) => {
      const parsed = childQuery.safeParse(request.query);
      if (!parsed.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      response.json(await readActivities(request.principal!, parsed.data.childId));
    });
  }

  router.get('/:activityId', async (request, response) => {
    const query = childQuery.safeParse(request.query);
    const params = activityParams.safeParse(request.params);
    if (!query.success || !params.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const { children, selectedChildId } = await authorizeChild(
      request.principal!,
      query.data.childId,
    );
    const activity = await prisma.studentActivity.findFirst({
      where: { id: params.data.activityId, studentId: selectedChildId },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        startedAt: true,
        endedAt: true,
        organization: true,
        progressEntries: {
          select: { id: true, title: true, occurredAt: true },
          orderBy: { occurredAt: 'desc' },
        },
        milestones: {
          select: { id: true, title: true, progress: true, completedAt: true },
          orderBy: { completedAt: 'desc' },
        },
        certificates: {
          select: { id: true, title: true, issuer: true, issuedAt: true, state: true },
          orderBy: { issuedAt: 'desc' },
        },
      },
    });
    if (!activity) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found.');
    response.json({
      children,
      child: {
        id: selectedChildId,
        displayName: children.find((item) => item.id === selectedChildId)?.displayName ?? 'Student',
      },
      activity,
    });
  });
  return router;
}
