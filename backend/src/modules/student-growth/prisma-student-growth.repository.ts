import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentGrowthRepository } from './student-growth.repository.js';
import type { GrowthData } from './student-growth.types.js';
const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
export class PrismaStudentGrowthRepository implements StudentGrowthRepository {
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
  async get(userId: string): Promise<GrowthData | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    if (!user) return null;
    const [subjects, tasks, activities, certificates, groups] = await Promise.all([
      this.db.studentSubject.findMany({
        where: { studentId: userId },
        orderBy: { displayOrder: 'asc' },
      }),
      this.db.studentTask.findMany({ where: { studentId: userId } }),
      this.db.studentActivity.findMany({
        where: { studentId: userId },
        include: { milestones: true },
        orderBy: { startedAt: 'desc' },
      }),
      this.db.studentActivityCertificate.findMany({
        where: { studentId: userId },
        orderBy: { issuedAt: 'desc' },
      }),
      this.db.communityGroupMembership.count({ where: { userId } }),
    ]);
    const academic = subjects.length
      ? Math.round(subjects.reduce((sum, item) => sum + item.progress, 0) / subjects.length)
      : 0;
    const completed = tasks.filter((task) => task.completedAt).length;
    const taskCompletion = percent(completed, tasks.length);
    const activityMilestones = activities.flatMap((activity) => activity.milestones);
    const activeActivities = activities.filter((activity) => activity.status === 'ACTIVE').length;
    const achievements = [
      ...certificates.map((item) => ({
        id: item.id,
        title: item.title,
        category: 'Certificate',
        date: item.issuedAt?.toISOString() ?? null,
      })),
      ...activityMilestones
        .filter((item) => item.completedAt)
        .map((item) => ({
          id: item.id,
          title: item.title,
          category: 'Activity milestone',
          date: item.completedAt?.toISOString() ?? null,
        })),
    ].slice(0, 12);
    return {
      studentName: user.displayName ?? 'Student',
      dimensions: [
        { name: 'Academic Development', value: academic, evidence: `${subjects.length} subjects` },
        {
          name: 'Consistency',
          value: taskCompletion,
          evidence: `${completed} of ${tasks.length} tasks completed`,
        },
        { name: 'Learning Progress', value: academic, evidence: 'Based on subject progress' },
        {
          name: 'Physical Activity',
          value: percent(
            activities.filter((item) => item.category === 'Sports').length,
            Math.max(activities.length, 1),
          ),
          evidence: `${activities.filter((item) => item.category === 'Sports').length} sports activities`,
        },
        {
          name: 'Creative Development',
          value: percent(
            activities.filter((item) => item.category === 'Creative').length,
            Math.max(activities.length, 1),
          ),
          evidence: `${activities.filter((item) => item.category === 'Creative').length} creative activities`,
        },
        {
          name: 'Communication',
          value: percent(groups, Math.max(groups, 1)),
          evidence: `${groups} community groups`,
        },
        {
          name: 'Participation',
          value: percent(activeActivities, Math.max(activities.length, 1)),
          evidence: `${activeActivities} active activities`,
        },
      ],
      academics: {
        subjects: subjects.map((item) => ({
          id: item.id,
          name: item.name,
          progress: item.progress,
        })),
        taskCompletion,
      },
      activities: activities.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        milestones: item.milestones.length,
        completedMilestones: item.milestones.filter((milestone) => milestone.completedAt).length,
      })),
      patterns: {
        tasksCreated: tasks.length,
        tasksCompleted: completed,
        groupMemberships: groups,
        activeActivities,
      },
      achievements,
    };
  }
}
