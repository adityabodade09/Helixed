import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { StudentDashboardRepository } from './student-dashboard.repository.js';
import type { StudentDashboardData } from './student-dashboard.types.js';

export class StudentDashboardService {
  constructor(
    private readonly repository: StudentDashboardRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal): Promise<StudentDashboardData> {
    const now = new Date();
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      now,
    );
    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'student_dashboard', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed) {
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to view this dashboard.');
    }

    const dashboard = await this.repository.getDashboard(principal.userId, now);
    if (!dashboard)
      throw new AppError(404, 'DASHBOARD_NOT_FOUND', 'Student dashboard data was not found.');
    return dashboard;
  }
}
