import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentDashboardRepository } from './student-dashboard.repository.js';
import type { StudentDashboardData } from './student-dashboard.types.js';

function startOfDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(value: Date): Date {
  const result = startOfDay(value);
  result.setDate(result.getDate() + 1);
  return result;
}

export class PrismaStudentDashboardRepository implements StudentDashboardRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null> {
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

  async getDashboard(userId: string, now: Date): Promise<StudentDashboardData | null> {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    if (!user) return null;

    const [schedule, tasks, subjects, exam, activities, announcements, opportunities] =
      await Promise.all([
        this.db.studentScheduleItem.findMany({
          where: { studentId: userId, startsAt: { gte: dayStart, lt: dayEnd } },
          orderBy: { startsAt: 'asc' },
        }),
        this.db.studentTask.findMany({
          where: { studentId: userId, completedAt: null },
          orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
          take: 4,
        }),
        this.db.studentSubject.findMany({
          where: { studentId: userId },
          orderBy: { displayOrder: 'asc' },
          take: 4,
        }),
        this.db.studentExam.findFirst({
          where: { studentId: userId, startsAt: { gte: now } },
          orderBy: { startsAt: 'asc' },
        }),
        this.db.studentActivity.findMany({
          where: { studentId: userId },
          orderBy: { occursAt: 'asc' },
          take: 4,
        }),
        this.db.studentAnnouncement.findMany({
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        this.db.opportunity.findMany({
          where: { isOpen: true },
          orderBy: { deadline: 'asc' },
          take: 4,
        }),
      ]);

    const progress = subjects.length
      ? Math.round(
          subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length,
        )
      : null;

    return {
      student: { displayName: user.displayName ?? 'Student' },
      today: dayStart.toISOString(),
      summary: {
        classesToday: schedule.length,
        tasksDue: tasks.filter((task) => task.dueAt && task.dueAt < dayEnd).length,
        upcomingExam: exam ? { title: exam.title, startsAt: exam.startsAt.toISOString() } : null,
        overallProgress: progress,
      },
      schedule: schedule.map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        startsAt: item.startsAt.toISOString(),
        color: item.color,
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        dueAt: task.dueAt?.toISOString() ?? null,
        priority: task.priority.toLowerCase() as 'high' | 'medium' | 'low',
      })),
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        progress: subject.progress,
        nextClassAt: subject.nextClassAt?.toISOString() ?? null,
      })),
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        detail: activity.detail,
        occursAt: activity.occursAt?.toISOString() ?? null,
      })),
      announcements: announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        createdAt: announcement.createdAt.toISOString(),
      })),
      opportunities: opportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        detail: opportunity.detail,
        deadline: opportunity.deadline?.toISOString() ?? null,
      })),
    };
  }
}
