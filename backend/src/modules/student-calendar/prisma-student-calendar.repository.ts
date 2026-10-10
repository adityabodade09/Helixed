import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentCalendarRepository } from './student-calendar.repository.js';
import type { CalendarEvent } from './student-calendar.types.js';
const iso = (value: Date) => value.toISOString();
export class PrismaStudentCalendarRepository implements StudentCalendarRepository {
  constructor(private readonly db: PrismaClient = prisma) {}
  async findStudentRoleAssignmentId(userId: string, now: Date) {
    const item = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'STUDENT',
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return item?.id ?? null;
  }
  async list(userId: string, from: Date, to: Date) {
    const [schedule, tasks, exams, activities] = await Promise.all([
      this.db.studentScheduleItem.findMany({
        where: { studentId: userId, startsAt: { gte: from, lt: to } },
      }),
      this.db.studentTask.findMany({ where: { studentId: userId, dueAt: { gte: from, lt: to } } }),
      this.db.studentExam.findMany({
        where: { studentId: userId, startsAt: { gte: from, lt: to } },
      }),
      this.db.studentActivity.findMany({
        where: { studentId: userId, occursAt: { gte: from, lt: to } },
      }),
    ]);
    return [
      ...schedule.map((item): CalendarEvent => ({
        id: `schedule:${item.id}`,
        type: 'class',
        title: item.title,
        detail: item.detail,
        startsAt: iso(item.startsAt),
        endsAt: iso(item.endsAt),
        color: item.color,
      })),
      ...tasks
        .filter((item) => item.dueAt)
        .map((item): CalendarEvent => ({
          id: `task:${item.id}`,
          type: 'deadline',
          title: item.title,
          detail: 'Task deadline',
          startsAt: iso(item.dueAt!),
          endsAt: null,
          color: 'rose',
        })),
      ...exams.map((item): CalendarEvent => ({
        id: `exam:${item.id}`,
        type: 'exam',
        title: item.title,
        detail: item.detail,
        startsAt: iso(item.startsAt),
        endsAt: null,
        color: 'purple',
      })),
      ...activities.map((item): CalendarEvent => ({
        id: `activity:${item.id}`,
        type: 'activity',
        title: item.title,
        detail: item.detail,
        startsAt: iso(item.occursAt!),
        endsAt: null,
        color: 'green',
      })),
    ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  async get(userId: string, eventId: string) {
    const [kind, id] = eventId.split(':');
    if (!id) return null;
    if (kind === 'schedule') {
      const x = await this.db.studentScheduleItem.findFirst({ where: { id, studentId: userId } });
      return x
        ? {
            id: eventId,
            type: 'class' as const,
            title: x.title,
            detail: x.detail,
            startsAt: iso(x.startsAt),
            endsAt: iso(x.endsAt),
            color: x.color,
          }
        : null;
    }
    if (kind === 'task') {
      const x = await this.db.studentTask.findFirst({ where: { id, studentId: userId } });
      return x?.dueAt
        ? {
            id: eventId,
            type: 'deadline' as const,
            title: x.title,
            detail: 'Task deadline',
            startsAt: iso(x.dueAt),
            endsAt: null,
            color: 'rose',
          }
        : null;
    }
    if (kind === 'exam') {
      const x = await this.db.studentExam.findFirst({ where: { id, studentId: userId } });
      return x
        ? {
            id: eventId,
            type: 'exam' as const,
            title: x.title,
            detail: x.detail,
            startsAt: iso(x.startsAt),
            endsAt: null,
            color: 'purple',
          }
        : null;
    }
    if (kind === 'activity') {
      const x = await this.db.studentActivity.findFirst({ where: { id, studentId: userId } });
      return x?.occursAt
        ? {
            id: eventId,
            type: 'activity' as const,
            title: x.title,
            detail: x.detail,
            startsAt: iso(x.occursAt),
            endsAt: null,
            color: 'green',
          }
        : null;
    }
    return null;
  }
}
