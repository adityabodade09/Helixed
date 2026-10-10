import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherOpportunitiesRepository } from './teacher-opportunities.repository.js';
import type { TeacherOpportunityFilters } from './teacher-opportunities.types.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherOpportunitiesRepository implements TeacherOpportunitiesRepository {
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

  async catalog(
    teacherId: string,
    schoolId: string,
    filters: TeacherOpportunityFilters,
    now: Date,
  ) {
    const availability: Prisma.OpportunityWhereInput =
      filters.availability === 'OPEN'
        ? { isOpen: true, OR: [{ deadline: null }, { deadline: { gte: now } }] }
        : filters.availability === 'CLOSED'
          ? { OR: [{ isOpen: false }, { deadline: { lt: now } }] }
          : {};
    const [teacher, school, categories, opportunities] = await Promise.all([
      this.db.user.findUnique({
        where: { id: teacherId },
        select: { id: true, displayName: true },
      }),
      this.db.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } }),
      this.db.opportunity.findMany({
        where: { category: { not: null } },
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
      this.db.opportunity.findMany({
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
        },
        orderBy: [{ deadline: 'asc' }, { title: 'asc' }],
      }),
    ]);
    if (!teacher || !school) return null;
    return {
      teacher,
      school,
      categories: categories.flatMap(({ category }) => (category ? [category] : [])),
      opportunities: opportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        detail: opportunity.detail,
        description: opportunity.description,
        category: opportunity.category,
        provider: opportunity.source,
        location: opportunity.location,
        deadline: opportunity.deadline?.toISOString() ?? null,
        availability:
          opportunity.isOpen && (!opportunity.deadline || opportunity.deadline >= now)
            ? ('OPEN' as const)
            : ('CLOSED' as const),
      })),
    };
  }
}
