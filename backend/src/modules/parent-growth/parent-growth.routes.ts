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
const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export function createParentGrowthRouter(auth: AuthService) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  async function authorizeChild(principal: AuthenticatedPrincipal, childId?: string) {
    const relationships = await prisma.parentStudentRelationship.findMany({
      where: { parentId: principal.userId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
    });
    const selectedChildId = childId ?? relationships[0]?.student.id;
    if (!selectedChildId) throw new AppError(403, 'FORBIDDEN', 'Growth access is not available.');
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: principal.userId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_growth', id: selectedChildId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed) throw new AppError(403, 'FORBIDDEN', 'Growth access is not available.');
    return { children: relationships.map((relationship) => relationship.student), selectedChildId };
  }

  async function growth(selectedChildId: string) {
    const [child, subjects, tasks, activities, certificates] = await Promise.all([
      prisma.user.findUnique({ where: { id: selectedChildId }, select: { displayName: true } }),
      prisma.studentSubject.findMany({
        where: { studentId: selectedChildId },
        select: { id: true, name: true, progress: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.studentTask.findMany({
        where: { studentId: selectedChildId },
        select: { completedAt: true },
      }),
      prisma.studentActivity.findMany({
        where: { studentId: selectedChildId },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          milestones: { select: { id: true, completedAt: true } },
        },
      }),
      prisma.studentActivityCertificate.findMany({
        where: { studentId: selectedChildId },
        select: { id: true, title: true, issuedAt: true },
        orderBy: { issuedAt: 'desc' },
        take: 12,
      }),
    ]);
    const completed = tasks.filter((task) => task.completedAt).length;
    const academic = subjects.length
      ? Math.round(subjects.reduce((sum, subject) => sum + subject.progress, 0) / subjects.length)
      : 0;
    const activeActivities = activities.filter((activity) => activity.status === 'ACTIVE').length;
    const milestones = activities.flatMap((activity) => activity.milestones);
    return {
      child: { id: selectedChildId, displayName: child?.displayName ?? 'Student' },
      dimensions: [
        { name: 'Academic development', value: academic, evidence: `${subjects.length} subjects` },
        {
          name: 'Task consistency',
          value: percent(completed, tasks.length),
          evidence: `${completed} of ${tasks.length} tasks completed`,
        },
        {
          name: 'Activity participation',
          value: percent(activeActivities, Math.max(activities.length, 1)),
          evidence: `${activeActivities} active activities`,
        },
      ],
      academics: { subjects, taskCompletion: percent(completed, tasks.length) },
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        category: activity.category,
        milestones: activity.milestones.length,
        completedMilestones: activity.milestones.filter((milestone) => milestone.completedAt)
          .length,
      })),
      patterns: {
        tasksCreated: tasks.length,
        tasksCompleted: completed,
        activeActivities,
        certificates: certificates.length,
      },
      achievements: [
        ...certificates.map((certificate) => ({
          id: certificate.id,
          title: certificate.title,
          category: 'Certificate',
          date: certificate.issuedAt?.toISOString() ?? null,
        })),
        ...milestones
          .filter((milestone) => milestone.completedAt)
          .map((milestone) => ({
            id: milestone.id,
            title: 'Completed activity milestone',
            category: 'Activity milestone',
            date: milestone.completedAt?.toISOString() ?? null,
          })),
      ].slice(0, 12),
    };
  }

  for (const path of [
    '/',
    '/overview',
    '/academics',
    '/activities',
    '/patterns',
    '/achievements',
  ]) {
    router.get(path, async (request, response) => {
      const parsed = query.safeParse(request.query);
      if (!parsed.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      const { children, selectedChildId } = await authorizeChild(
        request.principal!,
        parsed.data.childId,
      );
      response.json({ children, ...(await growth(selectedChildId)) });
    });
  }
  return router;
}
