import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentOpportunitiesRepository } from './student-opportunities.repository.js';
import type { Opportunity } from './student-opportunities.types.js';
const map = (item: {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  source: string | null;
  location: string | null;
  deadline: Date | null;
  isOpen: boolean;
  savedBy: unknown[];
  applications: Array<{ id: string; state: string; submittedAt: Date | null }>;
}): Opportunity => ({
  id: item.id,
  title: item.title,
  detail: item.detail,
  description: item.description,
  category: item.category,
  source: item.source,
  location: item.location,
  deadline: item.deadline?.toISOString() ?? null,
  isOpen: item.isOpen,
  saved: item.savedBy.length > 0,
  application: item.applications[0]
    ? {
        ...item.applications[0],
        submittedAt: item.applications[0].submittedAt?.toISOString() ?? null,
      }
    : null,
});
export class PrismaStudentOpportunitiesRepository implements StudentOpportunitiesRepository {
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
  private include(userId: string) {
    return {
      savedBy: { where: { studentId: userId } },
      applications: { where: { studentId: userId }, take: 1 },
    };
  }
  async list(userId: string, query?: string, category?: string) {
    const where = {
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { detail: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    };
    const items = await this.db.opportunity.findMany({
      where,
      include: this.include(userId),
      orderBy: { deadline: 'asc' },
    });
    return items.map(map);
  }
  async get(userId: string, id: string) {
    const item = await this.db.opportunity.findUnique({
      where: { id },
      include: this.include(userId),
    });
    return item ? map(item) : null;
  }
  async save(userId: string, id: string) {
    const exists = await this.db.opportunity.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    await this.db.savedOpportunity.upsert({
      where: { studentId_opportunityId: { studentId: userId, opportunityId: id } },
      create: { studentId: userId, opportunityId: id },
      update: {},
    });
    return this.get(userId, id);
  }
  async unsave(userId: string, id: string) {
    await this.db.savedOpportunity.deleteMany({ where: { studentId: userId, opportunityId: id } });
    return true;
  }
  async apply(userId: string, id: string, note?: string) {
    const opportunity = await this.db.opportunity.findUnique({
      where: { id },
      select: { id: true, isOpen: true, deadline: true },
    });
    if (!opportunity) return null;
    if (!opportunity.isOpen || (opportunity.deadline && opportunity.deadline < new Date()))
      return 'closed';
    const existing = await this.db.opportunityApplication.findUnique({
      where: { studentId_opportunityId: { studentId: userId, opportunityId: id } },
    });
    if (existing) return 'duplicate';
    await this.db.opportunityApplication.create({
      data: {
        studentId: userId,
        opportunityId: id,
        state: 'SUBMITTED',
        note,
        submittedAt: new Date(),
      },
    });
    return this.get(userId, id);
  }
}
