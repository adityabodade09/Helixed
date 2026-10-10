import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { TeacherMessagesRepository } from './teacher-messages.repository.js';
import type { TeacherMessageFilters } from './teacher-messages.types.js';

export class TeacherMessagesService {
  constructor(
    private readonly repository: TeacherMessagesRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(principal: AuthenticatedPrincipal, filters: TeacherMessageFilters) {
    const { assignment, now } = await this.authorize(principal, 'read');
    const inbox = await this.repository.inbox(principal.userId, assignment.schoolId, now);
    if (!inbox) throw this.denied();
    const search = filters.search?.toLocaleLowerCase();
    return {
      ...inbox,
      conversations: search
        ? inbox.conversations.filter((conversation) =>
            [conversation.title, ...conversation.contexts].some((value) =>
              value.toLocaleLowerCase().includes(search),
            ),
          )
        : inbox.conversations,
    };
  }

  async detail(principal: AuthenticatedPrincipal, conversationId: string) {
    const { assignment, now } = await this.authorize(principal, 'read');
    const thread = await this.repository.thread(
      principal.userId,
      assignment.schoolId,
      conversationId,
      now,
    );
    if (!thread) throw this.notFound();
    return thread;
  }

  async send(principal: AuthenticatedPrincipal, conversationId: string, body: string) {
    const { assignment, now } = await this.authorize(principal, 'create');
    const message = await this.repository.send(
      principal.userId,
      assignment.schoolId,
      conversationId,
      body,
      now,
    );
    if (!message) throw this.notFound();
    return message;
  }

  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw this.denied();
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'teacher_messages', id: principal.userId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.denied();
    return { assignment, now };
  }

  private denied() {
    return new AppError(403, 'FORBIDDEN', 'Teacher messages are unavailable.');
  }

  private notFound() {
    return new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
  }
}
