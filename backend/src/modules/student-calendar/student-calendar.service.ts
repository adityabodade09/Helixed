import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { StudentCalendarRepository } from './student-calendar.repository.js';
export class StudentCalendarService {
  constructor(
    private readonly repository: StudentCalendarRepository,
    private readonly authorization: AuthorizationService,
  ) {}
  private async authorize(principal: AuthenticatedPrincipal) {
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'student_calendar', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access the calendar.');
  }
  async list(principal: AuthenticatedPrincipal, from: Date, to: Date) {
    await this.authorize(principal);
    return this.repository.list(principal.userId, from, to);
  }
  async get(principal: AuthenticatedPrincipal, eventId: string) {
    await this.authorize(principal);
    const event = await this.repository.get(principal.userId, eventId);
    if (!event)
      throw new AppError(404, 'CALENDAR_EVENT_NOT_FOUND', 'Calendar event was not found.');
    return event;
  }
}
