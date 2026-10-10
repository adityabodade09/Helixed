import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherClassSummaryRepository } from './teacher-class-summary.repository.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherClassSummaryRepository implements TeacherClassSummaryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findTeacherRoleAssignment(userId: string, now: Date) {
    const role = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'TEACHER',
        scopeType: 'SCHOOL',
        schoolId: { not: null },
        ...activeAt(now),
      },
      select: { id: true, schoolId: true },
    });
    return role?.schoolId ? { id: role.id, schoolId: role.schoolId } : null;
  }

  async findClassSummary(teacherId: string, schoolId: string, classId: string, now: Date) {
    const [teacher, schoolClass] = await Promise.all([
      this.db.user.findUnique({
        where: { id: teacherId },
        select: { id: true, displayName: true },
      }),
      this.db.schoolClass.findFirst({
        where: {
          id: classId,
          schoolId,
          teacherAssignments: { some: { teacherId, ...activeAt(now) } },
        },
        select: {
          id: true,
          name: true,
          school: { select: { id: true, name: true } },
          studentMemberships: {
            where: {
              ...activeAt(now),
              student: { roleAssignments: { some: { roleCode: 'STUDENT', ...activeAt(now) } } },
            },
            select: { studentId: true },
          },
          attendanceSessions: {
            orderBy: { startsAt: 'desc' },
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
          assignments: {
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
            select: {
              id: true,
              title: true,
              subjectName: true,
              dueAt: true,
              status: true,
            },
          },
          assessments: {
            orderBy: { assessedAt: 'desc' },
            select: {
              id: true,
              title: true,
              subjectName: true,
              maximumMarks: true,
              assessedAt: true,
              marks: {
                where: { supersededAt: null },
                select: { studentId: true, value: true },
              },
            },
          },
        },
      }),
    ]);
    if (!teacher || !schoolClass) return null;
    return {
      teacher,
      school: schoolClass.school,
      schoolClass: {
        id: schoolClass.id,
        name: schoolClass.name,
        studentIds: schoolClass.studentMemberships.map(({ studentId }) => studentId),
        sessions: schoolClass.attendanceSessions,
        assignments: schoolClass.assignments,
        assessments: schoolClass.assessments,
      },
    };
  }
}
