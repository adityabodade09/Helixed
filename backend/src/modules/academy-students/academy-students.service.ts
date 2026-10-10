import { AppError } from '../../shared/errors/AppError.js';
import type { AcademyDashboardRepository } from '../academy-dashboard/academy-dashboard.repository.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { AcademyStudentsRepository } from './academy-students.repository.js';
import type {
  AcademyStudentDetailResponse,
  AcademyStudentFilters,
  AcademyStudentsResponse,
} from './academy-students.types.js';

export class AcademyStudentsService {
  constructor(
    private readonly scope: AcademyDashboardRepository,
    private readonly repository: AcademyStudentsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    filters: AcademyStudentFilters,
  ): Promise<AcademyStudentsResponse> {
    const now = new Date();
    const assignment = await this.scope.findRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_students', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id, batchId: filters.batchId },
    });
    if (!decision.allowed) throw this.unavailable();

    const record = await this.repository.list(assignment.academyId, filters, now);
    if (!record) throw this.unavailable();

    return {
      academy: record.academy,
      batches: record.batches,
      students: record.enrollments
        .map(({ student, enrolledAt, batches }) => ({
          id: student.id,
          displayName: student.displayName ?? 'Student',
          enrolledAt: enrolledAt.toISOString(),
          batches,
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id)),
    };
  }

  async detail(
    principal: AuthenticatedPrincipal,
    studentId: string,
  ): Promise<AcademyStudentDetailResponse> {
    const now = new Date();
    const assignment = await this.scope.findRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_students', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.unavailable();

    const record = await this.repository.detail(assignment.academyId, studentId, now);
    if (!record) throw this.unavailable();

    return {
      academy: record.academy,
      student: {
        ...record.student,
        displayName: record.student.displayName ?? 'Student',
        enrolledAt: record.student.enrolledAt.toISOString(),
      },
    };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Academy students are unavailable.');
  }
}
