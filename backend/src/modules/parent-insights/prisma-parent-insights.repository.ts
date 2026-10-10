import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { ParentInsightsRepository } from './parent-insights.repository.js';

export class PrismaParentInsightsRepository implements ParentInsightsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findParentRoleAssignmentId(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'PARENT',
        activeFrom: { lte: now },
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return assignment?.id ?? null;
  }

  async children(parentId: string) {
    const relationships = await this.db.parentStudentRelationship.findMany({
      where: { parentId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
      orderBy: { student: { displayName: 'asc' } },
    });
    return relationships.map((relationship) => relationship.student);
  }

  async evidence(childId: string, periodStart: Date, now: Date, upcomingEnd: Date) {
    const [child, subjects, tasks, sessions, activities, certificates, exams, schedule] =
      await Promise.all([
        this.db.user.findUnique({
          where: { id: childId },
          select: { id: true, displayName: true },
        }),
        this.db.studentSubject.findMany({
          where: { studentId: childId },
          select: { id: true, name: true, progress: true },
          orderBy: { displayOrder: 'asc' },
        }),
        this.db.studentTask.findMany({
          where: {
            studentId: childId,
            OR: [
              { createdAt: { gte: periodStart, lte: now } },
              { completedAt: { gte: periodStart, lte: now } },
              { dueAt: { gte: periodStart, lte: upcomingEnd } },
            ],
          },
          select: { id: true, title: true, dueAt: true, completedAt: true },
          orderBy: { dueAt: 'asc' },
        }),
        this.db.attendanceSession.findMany({
          where: {
            state: 'COMPLETED',
            startsAt: { gte: periodStart, lte: now },
            schoolClass: {
              studentMemberships: {
                some: {
                  studentId: childId,
                  activeFrom: { lte: now },
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
              },
            },
          },
          select: {
            records: {
              where: { studentId: childId, supersededAt: null },
              select: { state: true },
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        }),
        this.db.studentActivity.findMany({
          where: { studentId: childId },
          select: {
            id: true,
            title: true,
            status: true,
            milestones: { select: { completedAt: true } },
          },
          orderBy: { title: 'asc' },
        }),
        this.db.studentActivityCertificate.count({ where: { studentId: childId } }),
        this.db.studentExam.findMany({
          where: { studentId: childId, startsAt: { gte: now, lte: upcomingEnd } },
          select: { id: true, title: true, startsAt: true },
          orderBy: { startsAt: 'asc' },
        }),
        this.db.studentScheduleItem.findMany({
          where: { studentId: childId, startsAt: { gte: now, lte: upcomingEnd } },
          select: { id: true, title: true, startsAt: true },
          orderBy: { startsAt: 'asc' },
        }),
      ]);

    if (!child) return null;
    return {
      child: { id: child.id, displayName: child.displayName ?? 'Student' },
      subjects,
      tasks,
      attendance: sessions.map((session) => session.records[0]?.state ?? null),
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        active: activity.status === 'ACTIVE',
        milestones: activity.milestones.length,
        completedMilestones: activity.milestones.filter((milestone) => milestone.completedAt)
          .length,
      })),
      certificates,
      upcoming: {
        tasks: tasks.flatMap((task) =>
          task.dueAt && !task.completedAt && task.dueAt >= now && task.dueAt <= upcomingEnd
            ? [{ id: task.id, title: task.title, at: task.dueAt }]
            : [],
        ),
        exams: exams.map((exam) => ({ id: exam.id, title: exam.title, at: exam.startsAt })),
        schedule: schedule.map((item) => ({ id: item.id, title: item.title, at: item.startsAt })),
      },
    };
  }
}
