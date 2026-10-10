import { AppError } from '../../shared/errors/AppError.js';
import { prisma } from '../../database/prisma.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { AiProvider } from './ai-provider.js';
export class StudentAiService {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly provider: AiProvider,
  ) {}
  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const assignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: principal.userId, roleCode: 'STUDENT', revokedAt: null },
      select: { id: true },
    });
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'student_ai', id: principal.userId },
      context: assignment ? { roleAssignmentId: assignment.id } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to use AI.');
  }
  async list(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return prisma.aiConversation.findMany({
      where: { studentId: principal.userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, feature: true, updatedAt: true },
    });
  }
  async get(principal: AuthenticatedPrincipal, id: string) {
    await this.authorize(principal, 'read');
    const item = await prisma.aiConversation.findFirst({
      where: { id, studentId: principal.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });
    if (!item) throw new AppError(404, 'AI_CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    return item;
  }
  async prompt(
    principal: AuthenticatedPrincipal,
    feature: string,
    prompt: string,
    conversationId?: string,
  ) {
    await this.authorize(principal, 'create');
    let conversation = conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: conversationId, studentId: principal.userId },
        })
      : null;
    if (conversationId && !conversation)
      throw new AppError(404, 'AI_CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    if (!conversation)
      conversation = await prisma.aiConversation.create({
        data: { studentId: principal.userId, feature, title: prompt.slice(0, 80) },
      });
    const subjects = await prisma.studentSubject.findMany({
      where: { studentId: principal.userId },
      select: { name: true },
      take: 6,
    });
    const response = await this.provider.respond({
      prompt,
      feature,
      context: { subjectNames: subjects.map((x) => x.name) },
    });
    await prisma.$transaction([
      prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          studentId: principal.userId,
          role: 'student',
          content: prompt,
        },
      }),
      prisma.aiMessage.create({
        data: {
          conversationId: conversation.id,
          studentId: principal.userId,
          role: 'assistant',
          content: response,
        },
      }),
      prisma.aiConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);
    return this.get(principal, conversation.id);
  }
}
