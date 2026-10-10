import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';
import { summarizeAttendance, type AttendanceValue } from './attendance-summary.js';

const params = z.object({ childId: z.string().uuid() });

export function createParentAttendanceRouter(auth: AuthService) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  router.get('/:childId/attendance', async (request, response) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const childId = parsed.data.childId;
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: request.principal!.userId, roleCode: 'PARENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await authorization.can(request.principal!, {
      action: 'read',
      resource: { type: 'parent_attendance', id: childId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Attendance access is not available.');

    const now = new Date();
    const [child, sessions] = await Promise.all([
      prisma.user.findUnique({ where: { id: childId }, select: { id: true, displayName: true } }),
      prisma.attendanceSession.findMany({
        where: {
          state: 'COMPLETED',
          startsAt: { lte: now },
          schoolClass: {
            studentMemberships: {
              some: {
                studentId: childId,
                activeFrom: { lte: now },
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        },
        select: {
          id: true,
          subjectName: true,
          startsAt: true,
          endsAt: true,
          records: {
            where: { studentId: childId, supersededAt: null },
            select: { state: true },
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { startsAt: 'desc' },
        take: 100,
      }),
    ]);
    if (!child) throw new AppError(403, 'FORBIDDEN', 'Attendance access is not available.');

    const attendance = sessions.map((session) => ({
      id: session.id,
      subject: session.subjectName,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      state: (session.records[0]?.state ?? null) as AttendanceValue,
    }));
    const bySubject = new Map<string, AttendanceValue[]>();
    for (const session of attendance) {
      const values = bySubject.get(session.subject) ?? [];
      values.push(session.state);
      bySubject.set(session.subject, values);
    }
    response.json({
      child,
      summary: summarizeAttendance(attendance.map((session) => session.state)),
      subjects: [...bySubject].map(([subject, states]) => ({
        subject,
        ...summarizeAttendance(states),
      })),
      sessions: attendance,
    });
  });
  return router;
}
