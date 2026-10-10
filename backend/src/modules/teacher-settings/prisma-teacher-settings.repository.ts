import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherSettingsRepository } from './teacher-settings.repository.js';

export class PrismaTeacherSettingsRepository implements TeacherSettingsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findTeacherRoleAssignmentId(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'TEACHER',
        scopeType: 'SCHOOL',
        schoolId: { not: null },
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return assignment?.id ?? null;
  }
}
