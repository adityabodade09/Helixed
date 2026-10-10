import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentActivitiesRepository } from './student-activities.repository.js';
import type {
  ActivityCertificate,
  ActivityDetail,
  ActivitySummary,
} from './student-activities.types.js';

const mapActivity = (item: {
  id: string;
  title: string;
  category: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  startedAt: Date | null;
  organization: string | null;
  description: string | null;
}): ActivitySummary => ({
  ...item,
  status: item.status.toLowerCase() as ActivitySummary['status'],
  startedAt: item.startedAt?.toISOString() ?? null,
});
const mapCertificate = (item: {
  id: string;
  title: string;
  issuer: string | null;
  issuedAt: Date | null;
  state: 'VERIFIED' | 'PENDING' | 'NOT_VERIFIED';
  activity: { id: string; title: string } | null;
}): ActivityCertificate => ({
  id: item.id,
  title: item.title,
  issuer: item.issuer,
  issuedAt: item.issuedAt?.toISOString() ?? null,
  state: item.state.toLowerCase() as ActivityCertificate['state'],
  activity: item.activity,
});

export class PrismaStudentActivitiesRepository implements StudentActivitiesRepository {
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
  async list(userId: string) {
    const items = await this.db.studentActivity.findMany({
      where: { studentId: userId },
      orderBy: [{ status: 'asc' }, { startedAt: 'desc' }],
    });
    return items.map(mapActivity);
  }
  async get(userId: string, activityId: string): Promise<ActivityDetail | null> {
    const item = await this.db.studentActivity.findFirst({
      where: { id: activityId, studentId: userId },
      include: {
        progressEntries: { orderBy: { occurredAt: 'desc' } },
        milestones: { orderBy: { completedAt: 'desc' } },
        certificates: {
          include: { activity: { select: { id: true, title: true } } },
          orderBy: { issuedAt: 'desc' },
        },
      },
    });
    if (!item) return null;
    return {
      ...mapActivity(item),
      progress: item.progressEntries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        detail: entry.detail,
        occurredAt: entry.occurredAt.toISOString(),
      })),
      milestones: item.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        progress: milestone.progress,
        completedAt: milestone.completedAt?.toISOString() ?? null,
      })),
      certificates: item.certificates.map(mapCertificate),
    };
  }
  async certificates(userId: string) {
    const items = await this.db.studentActivityCertificate.findMany({
      where: { studentId: userId },
      include: { activity: { select: { id: true, title: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    return items.map(mapCertificate);
  }
  async create(
    userId: string,
    input: {
      title: string;
      category: string;
      startedAt: Date;
      organization?: string;
      description?: string;
    },
  ) {
    const item = await this.db.studentActivity.create({
      data: {
        studentId: userId,
        title: input.title,
        category: input.category,
        startedAt: input.startedAt,
        organization: input.organization,
        description: input.description,
      },
    });
    return mapActivity(item);
  }
}
