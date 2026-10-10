import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { CommunityMessage } from '../student-community/student-community.types.js';
import { findParentTeacherContexts } from '../parent-teachers/parent-teacher-context.js';
import type { ParentMessagesRepository } from './parent-messages.repository.js';
import type { DirectConversationDetail } from './parent-messages.types.js';

const mapMessage = (message: {
  id: string;
  body: string;
  createdAt: Date;
  sender: { id: string; displayName: string | null };
}): CommunityMessage => ({
  id: message.id,
  body: message.body,
  createdAt: message.createdAt.toISOString(),
  sender: { id: message.sender.id, displayName: message.sender.displayName ?? 'Helixed member' },
});

export class PrismaParentMessagesRepository implements ParentMessagesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findParentRoleAssignmentId(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'PARENT',
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return assignment?.id ?? null;
  }

  teacherContexts(parentId: string, now: Date) {
    return findParentTeacherContexts(parentId, now, this.db);
  }

  async conversations(parentId: string) {
    const conversations = await this.db.communityConversation.findMany({
      where: { kind: 'DIRECT', members: { some: { userId: parentId } } },
      select: {
        id: true,
        updatedAt: true,
        members: {
          where: { userId: { not: parentId } },
          select: { user: { select: { id: true, displayName: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return conversations.flatMap((conversation) => {
      const peer = conversation.members.length === 1 ? conversation.members[0]?.user : null;
      return peer
        ? [
            {
              id: conversation.id,
              peerId: peer.id,
              peerName: peer.displayName ?? 'Teacher',
              preview: conversation.messages[0]?.body ?? null,
              updatedAt: conversation.updatedAt.toISOString(),
            },
          ]
        : [];
    });
  }

  async conversation(parentId: string, conversationId: string) {
    const conversation = await this.db.communityConversation.findFirst({
      where: { id: conversationId, kind: 'DIRECT', members: { some: { userId: parentId } } },
      select: {
        id: true,
        updatedAt: true,
        members: {
          where: { userId: { not: parentId } },
          select: { user: { select: { id: true, displayName: true } } },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: {
            id: true,
            body: true,
            createdAt: true,
            sender: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    const peer = conversation?.members.length === 1 ? conversation.members[0]?.user : null;
    if (!conversation || !peer) return null;
    return {
      id: conversation.id,
      peerId: peer.id,
      peerName: peer.displayName ?? 'Teacher',
      preview: conversation.messages.at(-1)?.body ?? null,
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map(mapMessage),
    } satisfies DirectConversationDetail;
  }

  async send(parentId: string, conversationId: string, body: string) {
    const conversation = await this.db.communityConversation.findFirst({
      where: { id: conversationId, kind: 'DIRECT', members: { some: { userId: parentId } } },
      select: { members: { select: { userId: true } } },
    });
    if (!conversation || conversation.members.length !== 2) return null;
    const message = await this.db.$transaction(async (transaction) => {
      const created = await transaction.communityMessage.create({
        data: { conversationId, senderId: parentId, body },
        select: {
          id: true,
          body: true,
          createdAt: true,
          sender: { select: { id: true, displayName: true } },
        },
      });
      await transaction.communityConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return created;
    });
    return mapMessage(message);
  }
}
