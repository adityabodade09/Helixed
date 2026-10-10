import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { AcademyDashboardRepository } from './academy-dashboard.repository.js';
import type { AcademyDashboard } from './academy-dashboard.types.js';

export class AcademyDashboardService {
  constructor(
    private readonly repository: AcademyDashboardRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal): Promise<AcademyDashboard> {
    const now = new Date();
    const assignment = await this.repository.findRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_dashboard', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.unavailable();

    const record = await this.repository.dashboard(assignment.academyId, now);
    if (!record) throw this.unavailable();

    return {
      academy: record.academy,
      summary: {
        enrolledStudents: new Set(record.enrolledStudentIds).size,
        batches: record.batches.length,
        assignedCoaches: new Set(record.batches.flatMap(({ coachIds }) => coachIds)).size,
      },
      batches: record.batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        studentCount: new Set(batch.studentIds).size,
        coachCount: new Set(batch.coachIds).size,
      })),
    };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Academy dashboard access is unavailable.');
  }
}
