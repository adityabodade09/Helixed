import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { TeacherOpportunitiesRepository } from './teacher-opportunities.repository.js';
import type { TeacherOpportunityFilters } from './teacher-opportunities.types.js';

export class TeacherOpportunitiesService {
  constructor(
    private readonly repository: TeacherOpportunitiesRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal, filters: TeacherOpportunityFilters) {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw this.denied();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_opportunities', id: principal.userId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.denied();

    const catalog = await this.repository.catalog(
      principal.userId,
      assignment.schoolId,
      filters,
      now,
    );
    if (!catalog) throw this.denied();
    return {
      teacher: {
        id: catalog.teacher.id,
        displayName: catalog.teacher.displayName ?? 'Teacher',
      },
      school: catalog.school,
      discovery: {
        mode: 'GENERAL' as const,
        explanation:
          'General canonical opportunities are shown; no individualized relevance is calculated.',
      },
      filters: { categories: catalog.categories },
      opportunities: catalog.opportunities,
    };
  }

  private denied() {
    return new AppError(403, 'FORBIDDEN', 'Teacher opportunities are unavailable.');
  }
}
