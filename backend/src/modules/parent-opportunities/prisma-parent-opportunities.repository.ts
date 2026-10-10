import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { ParentOpportunitiesRepository } from './parent-opportunities.repository.js';
import type { ParentOpportunity, ParentOpportunityFilters } from './parent-opportunities.types.js';

export class PrismaParentOpportunitiesRepository implements ParentOpportunitiesRepository {
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

  async children(parentId: string) {
    const relationships = await this.db.parentStudentRelationship.findMany({
      where: { parentId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return relationships.map(({ student }) => student);
  }

  async categories() {
    const rows = await this.db.opportunity.findMany({
      where: { category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.flatMap(({ category }) => (category ? [category] : []));
  }

  async list(childId: string, filters: ParentOpportunityFilters, now: Date) {
    const availability: Prisma.OpportunityWhereInput =
      filters.availability === 'OPEN'
        ? { isOpen: true, OR: [{ deadline: null }, { deadline: { gte: now } }] }
        : filters.availability === 'CLOSED'
          ? { OR: [{ isOpen: false }, { deadline: { lt: now } }] }
          : {};
    const rows = await this.db.opportunity.findMany({
      where: {
        AND: [
          availability,
          filters.search
            ? {
                OR: [
                  { title: { contains: filters.search, mode: 'insensitive' } },
                  { detail: { contains: filters.search, mode: 'insensitive' } },
                  { description: { contains: filters.search, mode: 'insensitive' } },
                  { source: { contains: filters.search, mode: 'insensitive' } },
                ],
              }
            : {},
          filters.category ? { category: filters.category } : {},
        ],
      },
      select: {
        id: true,
        title: true,
        detail: true,
        description: true,
        category: true,
        source: true,
        location: true,
        deadline: true,
        isOpen: true,
        applications: {
          where: { studentId: childId },
          take: 1,
          select: { parentApproval: { select: { status: true } } },
        },
      },
      orderBy: [{ deadline: 'asc' }, { title: 'asc' }],
    });
    return rows.map((row): ParentOpportunity => ({
      id: row.id,
      title: row.title,
      detail: row.detail,
      description: row.description,
      category: row.category,
      provider: row.source,
      location: row.location,
      deadline: row.deadline?.toISOString() ?? null,
      availability: row.isOpen && (!row.deadline || row.deadline >= now) ? 'OPEN' : 'CLOSED',
      approvalPending: row.applications[0]?.parentApproval?.status === 'PENDING',
    }));
  }
}
