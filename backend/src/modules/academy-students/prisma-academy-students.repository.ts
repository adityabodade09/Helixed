import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AcademyStudentsRepository } from './academy-students.repository.js';
import type { AcademyStudentFilters } from './academy-students.types.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaAcademyStudentsRepository implements AcademyStudentsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async list(academyId: string, filters: AcademyStudentFilters, now: Date) {
    const membershipWhere = {
      ...activeAt(now),
      batch: { academyId },
      ...(filters.batchId ? { batchId: filters.batchId } : {}),
    };
    const academy = await this.db.academy.findFirst({
      where: { id: academyId, verifiedAt: { not: null } },
      select: {
        id: true,
        name: true,
        batches: {
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: { id: true, name: true },
        },
        enrollments: {
          where: {
            ...activeAt(now),
            ...(filters.search
              ? { student: { displayName: { contains: filters.search, mode: 'insensitive' } } }
              : {}),
            ...(filters.batchId ? { batchMemberships: { some: membershipWhere } } : {}),
          },
          select: {
            activeFrom: true,
            student: { select: { id: true, displayName: true } },
            batchMemberships: {
              where: membershipWhere,
              orderBy: { batch: { name: 'asc' } },
              select: { batch: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!academy) return null;

    return {
      academy: { id: academy.id, name: academy.name },
      batches: academy.batches,
      enrollments: academy.enrollments.map((enrollment) => ({
        student: enrollment.student,
        enrolledAt: enrollment.activeFrom,
        batches: enrollment.batchMemberships.map(({ batch }) => batch),
      })),
    };
  }

  async detail(academyId: string, studentId: string, now: Date) {
    const enrollment = await this.db.academyStudentEnrollment.findFirst({
      where: {
        academyId,
        studentId,
        ...activeAt(now),
        academy: { verifiedAt: { not: null } },
      },
      select: {
        activeFrom: true,
        academy: { select: { id: true, name: true } },
        student: { select: { id: true, displayName: true } },
        batchMemberships: {
          where: { ...activeAt(now), batch: { academyId } },
          orderBy: { batch: { name: 'asc' } },
          select: { batch: { select: { id: true, name: true } } },
        },
      },
    });
    if (!enrollment) return null;

    return {
      academy: enrollment.academy,
      student: {
        ...enrollment.student,
        enrolledAt: enrollment.activeFrom,
        batches: enrollment.batchMemberships.map(({ batch }) => batch),
      },
    };
  }
}
