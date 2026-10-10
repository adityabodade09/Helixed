import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AcademyBatchesRepository } from '../academy-batches/academy-batches.repository.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaAcademyDashboardRepository implements AcademyBatchesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findRoleAssignment(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: { in: ['ACADEMY_OWNER', 'ACADEMY_ADMIN'] },
        scopeType: 'ACADEMY',
        academyId: { not: null },
        ...activeAt(now),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, academyId: true },
    });
    return assignment?.academyId ? { id: assignment.id, academyId: assignment.academyId } : null;
  }

  async dashboard(academyId: string, now: Date) {
    const academy = await this.db.academy.findFirst({
      where: { id: academyId, verifiedAt: { not: null } },
      select: {
        id: true,
        name: true,
        enrollments: {
          where: activeAt(now),
          select: { studentId: true },
        },
        batches: {
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            name: true,
            studentMemberships: {
              where: {
                ...activeAt(now),
                enrollment: { academyId, ...activeAt(now) },
              },
              select: { enrollment: { select: { studentId: true } } },
            },
            coachAssignments: {
              where: {
                ...activeAt(now),
                coach: {
                  academyMemberships: {
                    some: { academyId, verifiedAt: { not: null }, ...activeAt(now) },
                  },
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
              select: { coachId: true },
            },
          },
        },
      },
    });
    if (!academy) return null;

    return {
      academy: { id: academy.id, name: academy.name },
      enrolledStudentIds: academy.enrollments.map(({ studentId }) => studentId),
      batches: academy.batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        studentIds: batch.studentMemberships.map(({ enrollment }) => enrollment.studentId),
        coachIds: batch.coachAssignments.map(({ coachId }) => coachId),
      })),
    };
  }

  async batchDetail(academyId: string, batchId: string, now: Date) {
    const batch = await this.db.academyBatch.findFirst({
      where: { id: batchId, academyId, academy: { verifiedAt: { not: null } } },
      select: {
        id: true,
        name: true,
        academy: { select: { id: true, name: true } },
        studentMemberships: {
          where: { ...activeAt(now), enrollment: { academyId, ...activeAt(now) } },
          select: {
            enrollment: { select: { student: { select: { id: true, displayName: true } } } },
          },
        },
        coachAssignments: {
          where: {
            ...activeAt(now),
            coach: {
              academyMemberships: {
                some: { academyId, verifiedAt: { not: null }, ...activeAt(now) },
              },
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
          select: { coach: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!batch) return null;

    return {
      academy: batch.academy,
      batch: { id: batch.id, name: batch.name },
      students: batch.studentMemberships.map(({ enrollment }) => enrollment.student),
      coaches: batch.coachAssignments.map(({ coach }) => coach),
    };
  }
}
