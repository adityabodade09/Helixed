import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { authenticateAccessToken } from '../auth/authentication.middleware.js';
import type { AuthService } from '../auth/auth.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { PrismaAuthorizationRepository } from '../authorization/prisma-authorization.repository.js';
import { findParentTeacherContexts } from './parent-teacher-context.js';

const params = z.object({ childId: z.string().uuid() });
const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export function createParentTeachersRouter(auth: AuthService) {
  const router = Router();
  const authorization = new AuthorizationService(new PrismaAuthorizationRepository());
  router.use(authenticateAccessToken((token) => auth.authenticate(token)));

  router.get('/:childId/teachers', async (request, response) => {
    const parsed = params.safeParse(request.params);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.');
    const childId = parsed.data.childId;
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: request.principal!.userId, roleCode: 'PARENT', ...activeAt(new Date()) },
      select: { id: true },
    });
    const decision = await authorization.can(request.principal!, {
      action: 'read',
      resource: { type: 'parent_teachers', id: childId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed) throw new AppError(403, 'FORBIDDEN', 'Teacher access is not available.');

    const teachers = (
      await findParentTeacherContexts(request.principal!.userId, new Date())
    ).filter((context) => context.childId === childId);
    const grouped = new Map<
      string,
      { id: string; displayName: string; classes: { name: string; schoolName: string }[] }
    >();
    for (const item of teachers) {
      const teacher = grouped.get(item.teacherId) ?? {
        id: item.teacherId,
        displayName: item.teacherName,
        classes: [],
      };
      teacher.classes.push({
        name: item.className,
        schoolName: item.schoolName,
      });
      grouped.set(item.teacherId, teacher);
    }
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, displayName: true },
    });
    if (!child) throw new AppError(403, 'FORBIDDEN', 'Teacher access is not available.');
    response.json({ child, teachers: [...grouped.values()] });
  });
  return router;
}
