import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';

const rangeQuery = z
  .object({ childId: z.string().uuid().optional(), from: z.coerce.date(), to: z.coerce.date() })
  .refine(
    (value) => value.to > value.from && value.to.getTime() - value.from.getTime() <= 370 * 86400000,
    'Invalid date range',
  );
const canonicalRangeQuery = z
  .object({ from: z.coerce.date(), to: z.coerce.date() })
  .refine(
    (value) => value.to > value.from && value.to.getTime() - value.from.getTime() <= 370 * 86400000,
    'Invalid date range',
  );
const childParams = z.object({ childId: z.string().uuid() });
const eventQuery = z.object({ childId: z.string().uuid().optional() });
const eventParams = z.object({ id: z.string().min(3).max(200) });
const iso = (value: Date) => value.toISOString();

export function createParentCalendarRouter(auth: AuthService, canonicalChildRoute = false) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  async function authorizeChild(principal: AuthenticatedPrincipal, childId?: string) {
    const relationships = await prisma.parentStudentRelationship.findMany({
      where: { parentId: principal.userId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
    });
    const selectedChildId = childId ?? relationships[0]?.student.id;
    if (!selectedChildId) throw new AppError(403, 'FORBIDDEN', 'Calendar access is not available.');
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: principal.userId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_calendar', id: selectedChildId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Calendar access is not available.');
    return { children: relationships.map((relationship) => relationship.student), selectedChildId };
  }

  async function readCalendar(
    principal: AuthenticatedPrincipal,
    childId: string | undefined,
    from: Date,
    to: Date,
  ) {
    const { children, selectedChildId } = await authorizeChild(principal, childId);
    const [schedule, tasks, exams, activities] = await Promise.all([
      prisma.studentScheduleItem.findMany({
        where: { studentId: selectedChildId, startsAt: { gte: from, lt: to } },
        select: { id: true, title: true, detail: true, startsAt: true, endsAt: true, color: true },
      }),
      prisma.studentTask.findMany({
        where: { studentId: selectedChildId, dueAt: { gte: from, lt: to } },
        select: { id: true, title: true, dueAt: true },
      }),
      prisma.studentExam.findMany({
        where: { studentId: selectedChildId, startsAt: { gte: from, lt: to } },
        select: { id: true, title: true, detail: true, startsAt: true },
      }),
      prisma.studentActivity.findMany({
        where: { studentId: selectedChildId, occursAt: { gte: from, lt: to } },
        select: { id: true, title: true, detail: true, occursAt: true },
      }),
    ]);
    const events = [
      ...schedule.map((item) => ({
        id: `schedule:${item.id}`,
        type: 'class',
        title: item.title,
        detail: item.detail,
        startsAt: iso(item.startsAt),
        endsAt: iso(item.endsAt),
        color: item.color,
      })),
      ...tasks
        .filter((item) => item.dueAt)
        .map((item) => ({
          id: `task:${item.id}`,
          type: 'deadline',
          title: item.title,
          detail: 'Task deadline',
          startsAt: iso(item.dueAt!),
          endsAt: null,
          color: 'rose',
        })),
      ...exams.map((item) => ({
        id: `exam:${item.id}`,
        type: 'exam',
        title: item.title,
        detail: item.detail,
        startsAt: iso(item.startsAt),
        endsAt: null,
        color: 'purple',
      })),
      ...activities.map((item) => ({
        id: `activity:${item.id}`,
        type: 'activity',
        title: item.title,
        detail: item.detail,
        startsAt: iso(item.occursAt!),
        endsAt: null,
        color: 'green',
      })),
    ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const hasCalendarData =
      events.length > 0 ||
      (
        await Promise.all([
          prisma.studentScheduleItem.count({ where: { studentId: selectedChildId } }),
          prisma.studentTask.count({ where: { studentId: selectedChildId, dueAt: { not: null } } }),
          prisma.studentExam.count({ where: { studentId: selectedChildId } }),
          prisma.studentActivity.count({
            where: { studentId: selectedChildId, occursAt: { not: null } },
          }),
        ])
      ).some(Boolean);
    return {
      children,
      child: {
        id: selectedChildId,
        displayName:
          children.find((child) => child.id === selectedChildId)?.displayName ?? 'Student',
      },
      events,
      hasCalendarData,
    };
  }

  if (canonicalChildRoute) {
    router.get('/:childId/calendar', async (request, response) => {
      const params = childParams.safeParse(request.params);
      const range = canonicalRangeQuery.safeParse(request.query);
      if (!params.success || !range.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      const calendar = await readCalendar(
        request.principal!,
        params.data.childId,
        range.data.from,
        range.data.to,
      );
      response.json({ child: calendar.child, events: calendar.events });
    });
  } else {
    router.get('/', async (request, response) => {
      const parsed = rangeQuery.safeParse(request.query);
      if (!parsed.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      response.json(
        await readCalendar(
          request.principal!,
          parsed.data.childId,
          parsed.data.from,
          parsed.data.to,
        ),
      );
    });
  }

  if (!canonicalChildRoute)
    router.get('/event/:id', async (request, response) => {
      const query = eventQuery.safeParse(request.query);
      const params = eventParams.safeParse(request.params);
      if (!query.success || !params.success)
        throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
      const { children, selectedChildId } = await authorizeChild(
        request.principal!,
        query.data.childId,
      );
      const [kind, id] = params.data.id.split(':');
      if (!kind || !id || !['schedule', 'task', 'exam', 'activity'].includes(kind))
        throw new AppError(404, 'CALENDAR_EVENT_NOT_FOUND', 'Calendar event was not found.');
      const event = await (async () => {
        if (kind === 'schedule') {
          const item = await prisma.studentScheduleItem.findFirst({
            where: { id, studentId: selectedChildId },
          });
          return (
            item && {
              id: params.data.id,
              type: 'class',
              title: item.title,
              detail: item.detail,
              startsAt: iso(item.startsAt),
              endsAt: iso(item.endsAt),
              color: item.color,
            }
          );
        }
        if (kind === 'task') {
          const item = await prisma.studentTask.findFirst({
            where: { id, studentId: selectedChildId },
          });
          return (
            item?.dueAt && {
              id: params.data.id,
              type: 'deadline',
              title: item.title,
              detail: 'Task deadline',
              startsAt: iso(item.dueAt),
              endsAt: null,
              color: 'rose',
            }
          );
        }
        if (kind === 'exam') {
          const item = await prisma.studentExam.findFirst({
            where: { id, studentId: selectedChildId },
          });
          return (
            item && {
              id: params.data.id,
              type: 'exam',
              title: item.title,
              detail: item.detail,
              startsAt: iso(item.startsAt),
              endsAt: null,
              color: 'purple',
            }
          );
        }
        const item = await prisma.studentActivity.findFirst({
          where: { id, studentId: selectedChildId },
        });
        return (
          item?.occursAt && {
            id: params.data.id,
            type: 'activity',
            title: item.title,
            detail: item.detail,
            startsAt: iso(item.occursAt),
            endsAt: null,
            color: 'green',
          }
        );
      })();
      if (!event)
        throw new AppError(404, 'CALENDAR_EVENT_NOT_FOUND', 'Calendar event was not found.');
      response.json({
        children,
        child: {
          id: selectedChildId,
          displayName:
            children.find((child) => child.id === selectedChildId)?.displayName ?? 'Student',
        },
        event,
      });
    });
  return router;
}
