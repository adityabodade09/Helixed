import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { StudentGrowthRepository } from './student-growth.repository.js';
export class StudentGrowthService {
  constructor(
    private readonly repository: StudentGrowthRepository,
    private readonly authorization: AuthorizationService,
  ) {}
  async get(principal: AuthenticatedPrincipal) {
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'student_growth', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access growth.');
    const data = await this.repository.get(principal.userId);
    if (!data) throw new AppError(404, 'STUDENT_GROWTH_NOT_FOUND', 'Student growth was not found.');
    return data;
  }
}
