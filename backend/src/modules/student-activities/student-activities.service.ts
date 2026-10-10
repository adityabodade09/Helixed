import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { StudentActivitiesRepository } from './student-activities.repository.js';

export class StudentActivitiesService {
  constructor(
    private readonly repository: StudentActivitiesRepository,
    private readonly authorization: AuthorizationService,
  ) {}
  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'student_activities', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access activities.');
  }
  async list(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.list(principal.userId);
  }
  async get(principal: AuthenticatedPrincipal, activityId: string) {
    await this.authorize(principal, 'read');
    const activity = await this.repository.get(principal.userId, activityId);
    if (!activity) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity was not found.');
    return activity;
  }
  async progress(principal: AuthenticatedPrincipal, activityId: string) {
    return this.get(principal, activityId);
  }
  async certificates(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.certificates(principal.userId);
  }
  async create(
    principal: AuthenticatedPrincipal,
    input: {
      title: string;
      category: string;
      startedAt: Date;
      organization?: string;
      description?: string;
    },
  ) {
    await this.authorize(principal, 'create');
    return this.repository.create(principal.userId, input);
  }
}
