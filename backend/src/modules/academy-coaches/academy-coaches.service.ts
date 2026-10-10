import { AppError } from '../../shared/errors/AppError.js';
import type { AcademyDashboardRepository } from '../academy-dashboard/academy-dashboard.repository.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { AcademyCoachesRepository } from './academy-coaches.repository.js';
import type { AcademyCoachesResponse, AcademyCoachFilters } from './academy-coaches.types.js';

export class AcademyCoachesService {
  constructor(
    private readonly scope: AcademyDashboardRepository,
    private readonly repository: AcademyCoachesRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    filters: AcademyCoachFilters,
  ): Promise<AcademyCoachesResponse> {
    const now = new Date();
    const assignment = await this.scope.findRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_coaches', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.unavailable();

    const record = await this.repository.list(assignment.academyId, filters, now);
    if (!record) throw this.unavailable();

    const coaches = [...new Map(record.coaches.map((coach) => [coach.user.id, coach])).values()]
      .map(({ user, joinedAt, batches }) => {
        const distinctBatches = [
          ...new Map(batches.map((batch) => [batch.id, batch])).values(),
        ].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
        return {
          id: user.id,
          displayName: user.displayName ?? 'Coach',
          joinedAt: joinedAt.toISOString(),
          batchCount: distinctBatches.length,
          batches: distinctBatches,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));

    return { academy: record.academy, summary: { coaches: coaches.length }, coaches };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Academy coaches are unavailable.');
  }
}
