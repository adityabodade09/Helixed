import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherMessagesRepository } from './teacher-messages.repository.js';
import type { TeacherConversationSummary } from './teacher-messages.types.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherMessagesRepository implements TeacherMessagesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findTeacherRoleAssignment(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'TEACHER',
        scopeType: 'SCHOOL',
        schoolId: { not: null },
        ...activeAt(now),
      },
      select: { id: true, schoolId: true },
    });
    return assignment?.schoolId ? { id: assignment.id, schoolId: assignment.schoolId } : null;
  }

  async inbox(teacherId: string, schoolId: string, now: Date) {
    const [teacher, school, assignments, conversations] = await Promise.all([
      this.db.user.findUnique({
        where: { id: teacherId },
        select: { id: true, displayName: true },
      }),
      this.db.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } }),
      this.db.teacherClassAssignment.findMany({
        where: { teacherId, schoolClass: { schoolId }, ...activeAt(now) },
        select: {
          schoolClass: {
            select: {
              name: true,
              studentMemberships: {
                where: activeAt(now),
                select: {
                  student: {
                    select: {
                      id: true,
                      displayName: true,
                      accountState: true,
                      studentGuardians: {
                        where: { verifiedAt: { not: null }, revokedAt: null },
                        select: {
                          parent: {
                            select: {
                              id: true,
                              displayName: true,
                              accountState: true,
                              roleAssignments: {
                                where: { roleCode: 'PARENT', ...activeAt(now) },
                                select: { id: true },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.communityConversation.findMany({
        where: { members: { some: { userId: teacherId } } },
        select: {
          id: true,
          kind: true,
          updatedAt: true,
          group: {
            select: {
              name: true,
              memberships: { where: { userId: teacherId }, select: { userId: true } },
            },
          },
          members: {
            where: { userId: { not: teacherId } },
            select: { user: { select: { id: true, displayName: true, accountState: true } } },
          },
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { body: true, createdAt: true },
          },
          _count: { select: { members: true } },
        },
      }),
    ]);
    if (!teacher || !school) return null;

    const students = new Map<string, { name: string; classes: Set<string> }>();
    const parents = new Map<string, { name: string; contexts: Set<string> }>();
    for (const assignment of assignments) {
      for (const membership of assignment.schoolClass.studentMemberships) {
        const student = membership.student;
        if (student.accountState !== 'ACTIVE') continue;
        const studentContext = students.get(student.id) ?? {
          name: student.displayName ?? 'Student',
          classes: new Set<string>(),
        };
        studentContext.classes.add(assignment.schoolClass.name);
        students.set(student.id, studentContext);
        for (const relationship of student.studentGuardians) {
          const parent = relationship.parent;
          if (parent.accountState !== 'ACTIVE' || !parent.roleAssignments.length) continue;
          const parentContext = parents.get(parent.id) ?? {
            name: parent.displayName ?? 'Parent',
            contexts: new Set<string>(),
          };
          parentContext.contexts.add(
            `Parent of ${student.displayName ?? 'Student'} · ${assignment.schoolClass.name}`,
          );
          parents.set(parent.id, parentContext);
        }
      }
    }

    const result: TeacherConversationSummary[] = [];
    for (const conversation of conversations) {
      const latest = conversation.messages[0];
      const latestAt = (latest?.createdAt ?? conversation.updatedAt).toISOString();
      if (conversation.kind === 'GROUP') {
        if (!conversation.group || !conversation.group.memberships.length) continue;
        result.push({
          id: conversation.id,
          kind: 'GROUP',
          title: conversation.group.name,
          participant: null,
          contexts: ['Authorized group'],
          preview: latest?.body ?? null,
          latestAt,
        });
        continue;
      }
      if (conversation._count.members !== 2 || conversation.members.length !== 1) continue;
      const peer = conversation.members[0]!.user;
      if (peer.accountState !== 'ACTIVE') continue;
      const parent = parents.get(peer.id);
      const student = students.get(peer.id);
      if (!parent && !student) continue;
      result.push({
        id: conversation.id,
        kind: 'DIRECT',
        title: parent?.name ?? student!.name,
        participant: {
          displayName: parent?.name ?? student!.name,
          role: parent ? 'PARENT' : 'STUDENT',
        },
        contexts: parent
          ? [...parent.contexts]
          : [...student!.classes].map((name) => `Student · ${name}`),
        preview: latest?.body ?? null,
        latestAt,
      });
    }
    result.sort((left, right) =>
      right.latestAt === left.latestAt
        ? left.id.localeCompare(right.id)
        : right.latestAt.localeCompare(left.latestAt),
    );
    return { teacher, school, conversations: result };
  }

  async thread(teacherId: string, schoolId: string, conversationId: string, now: Date) {
    const inbox = await this.inbox(teacherId, schoolId, now);
    const summary = inbox?.conversations.find(({ id }) => id === conversationId);
    if (!inbox || !summary) return null;
    const messages = await this.db.communityMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 200,
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
        sender: { select: { displayName: true } },
      },
    });
    return {
      teacher: inbox.teacher,
      school: inbox.school,
      conversation: {
        ...summary,
        messages: messages.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          sender: { displayName: message.sender.displayName ?? 'Helixed member' },
          sentByTeacher: message.senderId === teacherId,
        })),
      },
    };
  }

  async send(teacherId: string, schoolId: string, conversationId: string, body: string, now: Date) {
    const inbox = await this.inbox(teacherId, schoolId, now);
    if (!inbox?.conversations.some(({ id }) => id === conversationId)) return null;
    const message = await this.db.$transaction(async (transaction) => {
      const created = await transaction.communityMessage.create({
        data: { conversationId, senderId: teacherId, body },
        select: {
          id: true,
          body: true,
          createdAt: true,
          sender: { select: { displayName: true } },
        },
      });
      await transaction.communityConversation.update({
        where: { id: conversationId },
        data: { updatedAt: created.createdAt },
      });
      return created;
    });
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      sender: { displayName: message.sender.displayName ?? 'Teacher' },
      sentByTeacher: true,
    };
  }
}
