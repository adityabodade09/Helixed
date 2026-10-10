import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentCommunityRepository } from './student-community.repository.js';
import type {
  CommunityGroup,
  CommunityMessage,
  ConversationDetail,
  ConversationSummary,
} from './student-community.types.js';

const displayName = (value: string | null) => value ?? 'Helixed member';
const mapMessage = (message: {
  id: string;
  body: string;
  createdAt: Date;
  sender: { id: string; displayName: string | null };
}): CommunityMessage => ({
  id: message.id,
  body: message.body,
  createdAt: message.createdAt.toISOString(),
  sender: { id: message.sender.id, displayName: displayName(message.sender.displayName) },
});

export class PrismaStudentCommunityRepository implements StudentCommunityRepository {
  constructor(private readonly db: PrismaClient = prisma) {}
  async findStudentRoleAssignmentId(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'STUDENT',
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return assignment?.id ?? null;
  }
  private async mapConversation(
    userId: string,
    item: {
      id: string;
      kind: string;
      updatedAt: Date;
      groupId: string | null;
      group: { name: string } | null;
      members: { user: { displayName: string | null } }[];
      messages: { body: string }[];
    },
  ): Promise<ConversationSummary> {
    const peer = item.members[0]?.user.displayName ?? null;
    return {
      id: item.id,
      kind: item.kind.toLowerCase() as ConversationSummary['kind'],
      ...(item.groupId ? { groupId: item.groupId } : {}),
      title: item.group?.name ?? displayName(peer),
      preview: item.messages[0]?.body ?? null,
      updatedAt: item.updatedAt.toISOString(),
    };
  }
  async inbox(userId: string, kind?: 'group' | 'direct') {
    const items = await this.db.communityConversation.findMany({
      where: {
        members: { some: { userId } },
        ...(kind ? { kind: kind.toUpperCase() as 'GROUP' | 'DIRECT' } : {}),
      },
      include: {
        group: { select: { name: true } },
        members: {
          where: { userId: { not: userId } },
          include: { user: { select: { displayName: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(items.map((item) => this.mapConversation(userId, item)));
  }
  async sent(userId: string) {
    const messages = await this.db.communityMessage.findMany({
      where: { senderId: userId },
      include: { sender: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return messages.map(mapMessage);
  }
  async groups(userId: string) {
    const groups = await this.db.communityGroup.findMany({
      where: {
        OR: [{ visibility: 'STUDENT_DISCOVERABLE' }, { memberships: { some: { userId } } }],
      },
      include: {
        _count: { select: { memberships: true } },
        memberships: { where: { userId }, select: { userId: true } },
      },
      orderBy: { name: 'asc' },
    });
    return groups.map((group): CommunityGroup => ({
      id: group.id,
      name: group.name,
      description: group.description,
      visibility: group.visibility.toLowerCase() as CommunityGroup['visibility'],
      memberCount: group._count.memberships,
      joined: group.memberships.length > 0,
    }));
  }
  private async detail(userId: string, id: string, kind: 'GROUP' | 'DIRECT') {
    const item = await this.db.communityConversation.findFirst({
      where: { id, kind, members: { some: { userId } } },
      include: {
        group: { select: { name: true } },
        members: {
          where: { userId: { not: userId } },
          include: { user: { select: { displayName: true } } },
        },
        messages: {
          include: { sender: { select: { id: true, displayName: true } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });
    if (!item) return null;
    const summary = await this.mapConversation(userId, { ...item, messages: [] });
    return { ...summary, messages: item.messages.map(mapMessage) } satisfies ConversationDetail;
  }
  async group(userId: string, groupId: string) {
    const group = await this.db.communityGroup.findFirst({
      where: { id: groupId, memberships: { some: { userId } } },
      select: { conversation: { select: { id: true } } },
    });
    return group?.conversation ? this.detail(userId, group.conversation.id, 'GROUP') : null;
  }
  async direct(userId: string, conversationId: string) {
    return this.detail(userId, conversationId, 'DIRECT');
  }
  async joinGroup(userId: string, groupId: string) {
    const group = await this.db.communityGroup.findFirst({
      where: { id: groupId, visibility: 'STUDENT_DISCOVERABLE' },
      include: { _count: { select: { memberships: true } } },
    });
    if (!group) return null;
    const conversation = await this.db.communityConversation.findUnique({
      where: { groupId },
      select: { id: true },
    });
    if (!conversation) return null;
    await this.db.$transaction([
      this.db.communityGroupMembership.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId },
        update: {},
      }),
      this.db.communityConversationMember.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        create: { conversationId: conversation.id, userId },
        update: {},
      }),
    ]);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      visibility: group.visibility.toLowerCase() as CommunityGroup['visibility'],
      memberCount: group._count.memberships + 1,
      joined: true,
    };
  }
  async send(userId: string, conversationId: string, body: string) {
    const member = await this.db.communityConversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { conversationId: true },
    });
    if (!member) return null;
    const message = await this.db.communityMessage.create({
      data: { conversationId, senderId: userId, body },
      include: { sender: { select: { id: true, displayName: true } } },
    });
    await this.db.communityConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return mapMessage(message);
  }
}
