import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { StudentOpportunitiesRepository } from './student-opportunities.repository.js';
export class StudentOpportunitiesService {
  constructor(
    private readonly repository: StudentOpportunitiesRepository,
    private readonly authorization: AuthorizationService,
  ) {}
  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'student_opportunities', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access opportunities.');
  }
  async list(principal: AuthenticatedPrincipal, query?: string, category?: string) {
    await this.authorize(principal, 'read');
    return this.repository.list(principal.userId, query, category);
  }
  async get(principal: AuthenticatedPrincipal, id: string) {
    await this.authorize(principal, 'read');
    const item = await this.repository.get(principal.userId, id);
    if (!item) throw new AppError(404, 'OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    return item;
  }
  async save(principal: AuthenticatedPrincipal, id: string) {
    await this.authorize(principal, 'create');
    const item = await this.repository.save(principal.userId, id);
    if (!item) throw new AppError(404, 'OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    return item;
  }
  async unsave(principal: AuthenticatedPrincipal, id: string) {
    await this.authorize(principal, 'create');
    await this.repository.unsave(principal.userId, id);
  }
  async apply(principal: AuthenticatedPrincipal, id: string, note?: string) {
    await this.authorize(principal, 'create');
    const item = await this.repository.apply(principal.userId, id, note);
    if (item === 'duplicate')
      throw new AppError(409, 'APPLICATION_EXISTS', 'An application already exists.');
    if (item === 'closed')
      throw new AppError(409, 'OPPORTUNITY_CLOSED', 'This opportunity is closed.');
    if (!item) throw new AppError(404, 'OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    return item;
  }
}
