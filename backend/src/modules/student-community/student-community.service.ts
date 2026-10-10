import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { StudentCommunityRepository } from './student-community.repository.js';

export class StudentCommunityService {
  constructor(
    private readonly repository: StudentCommunityRepository,
    private readonly authorization: AuthorizationService,
  ) {}
  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'student_community', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access community.');
  }
  async inbox(principal: AuthenticatedPrincipal, kind?: 'group' | 'direct') {
    await this.authorize(principal, 'read');
    return this.repository.inbox(principal.userId, kind);
  }
  async sent(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.sent(principal.userId);
  }
  async groups(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.groups(principal.userId);
  }
  async group(principal: AuthenticatedPrincipal, groupId: string) {
    await this.authorize(principal, 'read');
    const result = await this.repository.group(principal.userId, groupId);
    if (!result)
      throw new AppError(404, 'COMMUNITY_GROUP_NOT_FOUND', 'Community group was not found.');
    return result;
  }
  async direct(principal: AuthenticatedPrincipal, conversationId: string) {
    await this.authorize(principal, 'read');
    const result = await this.repository.direct(principal.userId, conversationId);
    if (!result) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    return result;
  }
  async join(principal: AuthenticatedPrincipal, groupId: string) {
    await this.authorize(principal, 'create');
    const group = await this.repository.joinGroup(principal.userId, groupId);
    if (!group)
      throw new AppError(404, 'COMMUNITY_GROUP_NOT_FOUND', 'Community group was not found.');
    return group;
  }
  async send(principal: AuthenticatedPrincipal, conversationId: string, body: string) {
    await this.authorize(principal, 'create');
    const message = await this.repository.send(principal.userId, conversationId, body);
    if (!message) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    return message;
  }
}
