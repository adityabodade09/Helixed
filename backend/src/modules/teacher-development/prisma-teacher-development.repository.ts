import { RoleCode, type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherDevelopmentRepository } from './teacher-development.repository.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherDevelopmentRepository implements TeacherDevelopmentRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findTeacherRoleAssignment(userId: string, now: Date) {
    const role = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: RoleCode.TEACHER,
        scopeType: 'SCHOOL',
        schoolId: { not: null },
        ...activeAt(now),
      },
      select: { id: true, schoolId: true },
    });
    return role?.schoolId ? { id: role.id, schoolId: role.schoolId } : null;
  }

  async findScope(teacherId: string, schoolId: string, now: Date) {
    const [teacher, school] = await Promise.all([
      this.db.user.findUnique({
        where: { id: teacherId },
        select: {
          id: true,
          displayName: true,
          teacherClassAssignments: {
            where: { ...activeAt(now), schoolClass: { schoolId } },
            orderBy: { schoolClass: { name: 'asc' } },
            select: {
              schoolClass: {
                select: {
                  id: true,
                  name: true,
                  studentMemberships: {
                    where: {
                      ...activeAt(now),
                      student: {
                        roleAssignments: { some: { roleCode: RoleCode.STUDENT, ...activeAt(now) } },
                      },
                    },
                    orderBy: { student: { displayName: 'asc' } },
                    select: { student: { select: { id: true, displayName: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } }),
    ]);
    if (!teacher || !school) return null;
    return {
      teacher: { id: teacher.id, displayName: teacher.displayName },
      school,
      classes: teacher.teacherClassAssignments.map(({ schoolClass }) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        students: schoolClass.studentMemberships.map(({ student }) => student),
      })),
    };
  }

  async findEvidence(
    teacherId: string,
    schoolId: string,
    classId: string,
    studentId: string,
    now: Date,
  ) {
    const schoolClass = await this.db.schoolClass.findFirst({
      where: {
        id: classId,
        schoolId,
        teacherAssignments: { some: { teacherId, ...activeAt(now) } },
        studentMemberships: {
          some: {
            studentId,
            ...activeAt(now),
            student: {
              roleAssignments: { some: { roleCode: RoleCode.STUDENT, ...activeAt(now) } },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        studentMemberships: {
          where: { studentId, ...activeAt(now) },
          take: 1,
          select: { student: { select: { id: true, displayName: true } } },
        },
        attendanceSessions: {
          where: { state: 'COMPLETED', startsAt: { lte: now } },
          orderBy: { startsAt: 'asc' },
          take: 24,
          select: {
            id: true,
            subjectName: true,
            startsAt: true,
            records: {
              where: { studentId, supersededAt: null },
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: { state: true },
            },
          },
        },
        assignments: {
          orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
          select: { id: true, title: true, subjectName: true, dueAt: true, status: true },
        },
        assessments: {
          orderBy: { assessedAt: 'asc' },
          select: {
            id: true,
            title: true,
            subjectName: true,
            maximumMarks: true,
            assessedAt: true,
            marks: {
              where: { studentId, supersededAt: null },
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: { value: true },
            },
          },
        },
      },
    });
    const student = schoolClass?.studentMemberships[0]?.student;
    if (!schoolClass || !student) return null;
    return {
      schoolClass: { id: schoolClass.id, name: schoolClass.name },
      student,
      attendanceSessions: schoolClass.attendanceSessions.map(({ records, ...session }) => ({
        ...session,
        state: records[0]?.state ?? null,
      })),
      assignments: schoolClass.assignments,
      assessments: schoolClass.assessments.map(({ marks, ...assessment }) => ({
        ...assessment,
        mark: marks[0] ?? null,
      })),
    };
  }
}
