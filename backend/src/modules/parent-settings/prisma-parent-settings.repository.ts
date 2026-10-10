import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { ParentSettingsRepository } from './parent-settings.repository.js';

export class PrismaParentSettingsRepository implements ParentSettingsRepository {
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
}
