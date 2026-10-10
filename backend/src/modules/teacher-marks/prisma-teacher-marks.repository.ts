import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { MarksFilters, TeacherMarksRepository } from './teacher-marks.repository.js';
import type { MarkWrite, MarkWriteResult } from './teacher-marks.types.js';

class MarkConflictError extends Error {}

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherMarksRepository implements TeacherMarksRepository {
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

  async list(teacherId: string, schoolId: string, now: Date, filters: MarksFilters) {
    const teacher = await this.db.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        displayName: true,
        teacherClassAssignments: {
          where: {
            ...activeAt(now),
            ...(filters.classId ? { classId: filters.classId } : {}),
            schoolClass: { schoolId },
          },
          select: {
            schoolClass: {
              select: {
                id: true,
                name: true,
                studentMemberships: {
                  where: {
                    ...activeAt(now),
                    student: {
                      roleAssignments: { some: { roleCode: 'STUDENT', ...activeAt(now) } },
                    },
                  },
                  select: { studentId: true },
                },
                assessments: {
                  where: filters.search
                    ? {
                        OR: [
                          { title: { contains: filters.search, mode: 'insensitive' } },
                          { subjectName: { contains: filters.search, mode: 'insensitive' } },
                        ],
                      }
                    : undefined,
                  orderBy: { assessedAt: 'desc' },
                  select: {
                    id: true,
                    title: true,
                    subjectName: true,
                    maximumMarks: true,
                    assessedAt: true,
                    marks: {
                      where: { supersededAt: null },
                      select: { studentId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const school = await this.db.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });
    if (!teacher || !school) return null;
    return {
      teacher: { id: teacher.id, displayName: teacher.displayName },
      school,
      classes: teacher.teacherClassAssignments.map(({ schoolClass }) => {
        const activeStudents = new Set(
          schoolClass.studentMemberships.map(({ studentId }) => studentId),
        );
        return {
          id: schoolClass.id,
          name: schoolClass.name,
          studentCount: activeStudents.size,
          assessments: schoolClass.assessments.map(({ marks, ...assessment }) => ({
            ...assessment,
            recordedCount: marks.filter(({ studentId }) => activeStudents.has(studentId)).length,
          })),
        };
      }),
    };
  }

  async findAssessment(teacherId: string, schoolId: string, assessmentId: string, now: Date) {
    const assessment = await this.db.assessment.findFirst({
      where: {
        id: assessmentId,
        schoolClass: {
          schoolId,
          teacherAssignments: { some: { teacherId, ...activeAt(now) } },
        },
      },
      select: {
        id: true,
        title: true,
        subjectName: true,
        maximumMarks: true,
        assessedAt: true,
        schoolClass: {
          select: {
            id: true,
            name: true,
            studentMemberships: {
              where: {
                ...activeAt(now),
                student: { roleAssignments: { some: { roleCode: 'STUDENT', ...activeAt(now) } } },
              },
              orderBy: { student: { displayName: 'asc' } },
              select: {
                student: {
                  select: {
                    id: true,
                    displayName: true,
                    marksAsStudent: {
                      where: { assessmentId, supersededAt: null },
                      take: 1,
                      select: { id: true, value: true, recordedAt: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!assessment) return null;
    return {
      id: assessment.id,
      title: assessment.title,
      subjectName: assessment.subjectName,
      maximumMarks: assessment.maximumMarks,
      assessedAt: assessment.assessedAt,
      schoolClass: { id: assessment.schoolClass.id, name: assessment.schoolClass.name },
      students: assessment.schoolClass.studentMemberships.map(({ student }) => ({
        id: student.id,
        displayName: student.displayName,
        mark: student.marksAsStudent[0] ?? null,
      })),
    };
  }

  async record(
    teacherId: string,
    schoolId: string,
    assessmentId: string,
    writes: MarkWrite[],
    now: Date,
  ): Promise<MarkWriteResult> {
    try {
      return await this.db.$transaction(
        async (transaction) => {
          const assessment = await transaction.assessment.findFirst({
            where: {
              id: assessmentId,
              schoolClass: {
                schoolId,
                teacherAssignments: { some: { teacherId, ...activeAt(now) } },
              },
            },
            select: { classId: true, maximumMarks: true },
          });
          if (!assessment) return 'NOT_AVAILABLE';
          if (writes.some(({ value }) => value > assessment.maximumMarks)) return 'OUT_OF_RANGE';

          const studentIds = writes.map(({ studentId }) => studentId);
          const memberships = await transaction.classStudentMembership.findMany({
            where: {
              classId: assessment.classId,
              studentId: { in: studentIds },
              ...activeAt(now),
              student: { roleAssignments: { some: { roleCode: 'STUDENT', ...activeAt(now) } } },
            },
            select: { studentId: true },
          });
          if (memberships.length !== studentIds.length) return 'NOT_AVAILABLE';

          const currentMarks = await transaction.mark.findMany({
            where: { assessmentId, studentId: { in: studentIds }, supersededAt: null },
            select: { id: true, studentId: true, value: true },
          });
          const currentByStudent = new Map(currentMarks.map((mark) => [mark.studentId, mark]));
          if (
            writes.some(
              (write) =>
                (currentByStudent.get(write.studentId)?.id ?? null) !== write.expectedMarkId,
            )
          )
            return 'CONFLICT';

          for (const write of writes) {
            const current = currentByStudent.get(write.studentId);
            if (current?.value === write.value) continue;
            if (current) {
              const superseded = await transaction.mark.updateMany({
                where: { id: current.id, supersededAt: null },
                data: { supersededAt: now },
              });
              if (superseded.count !== 1) throw new MarkConflictError();
            }
            await transaction.mark.create({
              data: {
                assessmentId,
                studentId: write.studentId,
                recordedById: teacherId,
                value: write.value,
                previousMarkId: current?.id,
                recordedAt: now,
              },
            });
          }
          return 'SUCCESS';
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof MarkConflictError) return 'CONFLICT';
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      )
        return 'CONFLICT';
      throw error;
    }
  }
}
