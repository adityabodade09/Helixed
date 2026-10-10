import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { ParentTeacherContext } from '../parent-teachers/parent-teacher-context.js';
import type { ParentMessagesRepository } from './parent-messages.repository.js';
import type {
  DirectConversation,
  MessageContext,
  ParentConversationDetail,
  ParentConversationSummary,
} from './parent-messages.types.js';

const contextsFor = (contexts: ParentTeacherContext[], teacherId: string): MessageContext[] => {
  const unique = new Map<string, MessageContext>();
  for (const context of contexts.filter((item) => item.teacherId === teacherId)) {
    const value = {
      childId: context.childId,
      childName: context.childName,
      className: context.className,
      schoolName: context.schoolName,
    };
    unique.set(`${value.childId}:${value.className}:${value.schoolName}`, value);
  }
  return [...unique.values()];
};

const mapSummary = (
  conversation: DirectConversation,
  contexts: ParentTeacherContext[],
): ParentConversationSummary => ({
  id: conversation.id,
  teacher: { id: conversation.peerId, displayName: conversation.peerName },
  contexts: contextsFor(contexts, conversation.peerId),
  preview: conversation.preview,
  updatedAt: conversation.updatedAt,
});

export class ParentMessagesService {
  constructor(
    private readonly repository: ParentMessagesRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const roleAssignmentId = await this.repository.findParentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'parent_messages', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Messages are unavailable for this account.');
  }

  async list(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    const contexts = await this.repository.teacherContexts(principal.userId, new Date());
    const conversations = await this.repository.conversations(principal.userId);
    return conversations
      .filter((conversation) =>
        contexts.some((context) => context.teacherId === conversation.peerId),
      )
      .map((conversation) => mapSummary(conversation, contexts));
  }

  async detail(principal: AuthenticatedPrincipal, conversationId: string) {
    await this.authorize(principal, 'read');
    return this.authorizedConversation(principal, conversationId);
  }

  async send(principal: AuthenticatedPrincipal, conversationId: string, body: string) {
    await this.authorize(principal, 'create');
    await this.authorizedConversation(principal, conversationId);
    const message = await this.repository.send(principal.userId, conversationId, body);
    if (!message) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    return message;
  }

  private async authorizedConversation(
    principal: AuthenticatedPrincipal,
    conversationId: string,
  ): Promise<ParentConversationDetail> {
    const [contexts, conversation] = await Promise.all([
      this.repository.teacherContexts(principal.userId, new Date()),
      this.repository.conversation(principal.userId, conversationId),
    ]);
    if (!conversation || !contexts.some((context) => context.teacherId === conversation.peerId))
      throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    return {
      ...mapSummary(conversation, contexts),
      messages: conversation.messages,
    };
  }
}
