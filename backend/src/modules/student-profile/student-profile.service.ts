import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';

export class StudentProfileService {
  constructor(private readonly authorization: AuthorizationService) {}
  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'update') {
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: principal.userId, roleCode: 'STUDENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'student_profile', id: principal.userId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access this profile.');
  }
  async get(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    const user = await prisma.user.findUnique({
      where: { id: principal.userId },
      select: {
        displayName: true,
        studentProfile: true,
        dashboardActivities: { select: { id: true, title: true, category: true }, take: 6 },
        activityCertificates: {
          select: { id: true, title: true, issuer: true, state: true },
          take: 6,
        },
      },
    });
    if (!user) throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student was not found.');
    return {
      displayName: user.displayName ?? 'Student',
      bio: user.studentProfile?.bio ?? null,
      interests: user.studentProfile?.interests ?? [],
      avatarUrl: user.studentProfile?.avatarUrl ?? null,
      activities: user.dashboardActivities,
      certificates: user.activityCertificates,
    };
  }
  async update(
    principal: AuthenticatedPrincipal,
    input: { bio?: string | null; interests?: string[] },
  ) {
    await this.authorize(principal, 'update');
    await prisma.studentProfile.upsert({
      where: { userId: principal.userId },
      create: { userId: principal.userId, ...input },
      update: input,
    });
    return this.get(principal);
  }
}
