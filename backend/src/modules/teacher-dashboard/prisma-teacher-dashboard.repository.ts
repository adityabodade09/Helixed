import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherDashboardRepository } from './teacher-dashboard.repository.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherDashboardRepository implements TeacherDashboardRepository {
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

  async dashboard(teacherId: string, schoolId: string, now: Date) {
    const teacher = await this.db.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        displayName: true,
        teacherClassAssignments: {
          where: { schoolClass: { schoolId }, ...activeAt(now) },
          select: {
            schoolClass: {
              select: {
                id: true,
                name: true,
                school: { select: { id: true, name: true } },
                studentMemberships: {
                  where: activeAt(now),
                  select: {
                    student: {
                      select: {
                        id: true,
                        dashboardTasks: {
                          where: { completedAt: null },
                          select: { id: true },
                        },
                      },
                    },
                  },
                },
                attendanceSessions: {
                  orderBy: { startsAt: 'desc' },
                  take: 20,
                  select: {
                    id: true,
                    subjectName: true,
                    startsAt: true,
                    endsAt: true,
                    state: true,
                    records: {
                      where: { supersededAt: null },
                      select: { studentId: true, state: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!teacher) return null;
    const school =
      teacher.teacherClassAssignments[0]?.schoolClass.school ??
      (await this.db.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true },
      }));
    if (!school) return null;

    return {
      teacher: { id: teacher.id, displayName: teacher.displayName },
      school,
      classes: teacher.teacherClassAssignments.map(({ schoolClass }) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        studentIds: schoolClass.studentMemberships.map(({ student }) => student.id),
        openTaskCount: schoolClass.studentMemberships.reduce(
          (count, { student }) => count + student.dashboardTasks.length,
          0,
        ),
        sessions: schoolClass.attendanceSessions,
      })),
    };
  }
}
