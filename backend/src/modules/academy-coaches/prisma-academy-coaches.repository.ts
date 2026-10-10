import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AcademyCoachesRepository } from './academy-coaches.repository.js';
import type { AcademyCoachFilters } from './academy-coaches.types.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaAcademyCoachesRepository implements AcademyCoachesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async list(academyId: string, filters: AcademyCoachFilters, now: Date) {
    const academy = await this.db.academy.findFirst({
      where: { id: academyId, verifiedAt: { not: null } },
      select: {
        id: true,
        name: true,
        memberships: {
          where: {
            verifiedAt: { not: null },
            ...activeAt(now),
            user: {
              ...(filters.search
                ? { displayName: { contains: filters.search, mode: 'insensitive' as const } }
                : {}),
              roleAssignments: {
                some: {
                  academyId,
                  roleCode: 'ACADEMY_COACH',
                  scopeType: 'ACADEMY',
                  ...activeAt(now),
                },
              },
            },
          },
          select: {
            activeFrom: true,
            user: {
              select: {
                id: true,
                displayName: true,
                batchCoachAssignments: {
                  where: { ...activeAt(now), batch: { academyId } },
                  select: { batch: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!academy) return null;

    return {
      academy: { id: academy.id, name: academy.name },
      coaches: academy.memberships.map((membership) => ({
        user: { id: membership.user.id, displayName: membership.user.displayName },
        joinedAt: membership.activeFrom,
        batches: membership.user.batchCoachAssignments.map(({ batch }) => batch),
      })),
    };
  }
}
