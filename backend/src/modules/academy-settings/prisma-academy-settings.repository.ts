import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AcademySettingsRepository } from './academy-settings.repository.js';

export class PrismaAcademySettingsRepository implements AcademySettingsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findAcademy(academyId: string) {
    return this.db.academy.findFirst({
      where: { id: academyId, verifiedAt: { not: null } },
      select: { id: true, name: true },
    });
  }
}
