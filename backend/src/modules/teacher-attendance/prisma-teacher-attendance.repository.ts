import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type {
  AttendanceFilters,
  TeacherAttendanceRepository,
} from './teacher-attendance.repository.js';
import type { AttendanceWrite, AttendanceWriteResult } from './teacher-attendance.types.js';

class AttendanceConflictError extends Error {}

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

function dateRange(date?: string) {
  if (!date) return undefined;
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export class PrismaTeacherAttendanceRepository implements TeacherAttendanceRepository {
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

  async list(teacherId: string, schoolId: string, now: Date, filters: AttendanceFilters) {
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
                attendanceSessions: {
                  where: {
                    ...(filters.state ? { state: filters.state } : {}),
                    ...(filters.date ? { startsAt: dateRange(filters.date) } : {}),
                  },
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
      classes: teacher.teacherClassAssignments.map(({ schoolClass }) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        studentIds: schoolClass.studentMemberships.map(({ studentId }) => studentId),
        sessions: schoolClass.attendanceSessions,
      })),
    };
  }

  async findSession(teacherId: string, schoolId: string, sessionId: string, now: Date) {
    const session = await this.db.attendanceSession.findFirst({
      where: {
        id: sessionId,
        schoolClass: {
          schoolId,
          teacherAssignments: { some: { teacherId, ...activeAt(now) } },
        },
      },
      select: {
        id: true,
        subjectName: true,
        startsAt: true,
        endsAt: true,
        state: true,
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
              orderBy: { student: { displayName: 'asc' } },
              select: {
                student: {
                  select: {
                    id: true,
                    displayName: true,
                    attendanceRecords: {
                      where: { sessionId, supersededAt: null },
                      take: 1,
                      select: { id: true, state: true, recordedAt: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!session) return null;
    return {
      id: session.id,
      subjectName: session.subjectName,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      state: session.state,
      schoolClass: { id: session.schoolClass.id, name: session.schoolClass.name },
      students: session.schoolClass.studentMemberships.map(({ student }) => ({
        id: student.id,
        displayName: student.displayName,
        record: student.attendanceRecords[0] ?? null,
      })),
    };
  }

  async record(
    teacherId: string,
    schoolId: string,
    sessionId: string,
    writes: AttendanceWrite[],
    now: Date,
  ): Promise<AttendanceWriteResult> {
    try {
      return await this.db.$transaction(
        async (transaction) => {
          const session = await transaction.attendanceSession.findFirst({
            where: {
              id: sessionId,
              state: 'COMPLETED',
              schoolClass: {
                schoolId,
                teacherAssignments: { some: { teacherId, ...activeAt(now) } },
              },
            },
            select: { id: true, schoolClassId: true },
          });
          if (!session) return 'NOT_AVAILABLE';

          const studentIds = writes.map(({ studentId }) => studentId);
          const memberships = await transaction.classStudentMembership.findMany({
            where: {
              classId: session.schoolClassId,
              studentId: { in: studentIds },
              ...activeAt(now),
              student: { roleAssignments: { some: { roleCode: 'STUDENT', ...activeAt(now) } } },
            },
            select: { studentId: true },
          });
          if (memberships.length !== studentIds.length) return 'NOT_AVAILABLE';

          const currentRecords = await transaction.attendanceRecord.findMany({
            where: { sessionId, studentId: { in: studentIds }, supersededAt: null },
            select: { id: true, studentId: true, state: true },
          });
          const currentByStudent = new Map(
            currentRecords.map((record) => [record.studentId, record]),
          );
          if (
            writes.some(
              (write) =>
                (currentByStudent.get(write.studentId)?.id ?? null) !== write.expectedRecordId,
            )
          )
            return 'CONFLICT';

          for (const write of writes) {
            const current = currentByStudent.get(write.studentId);
            if (current?.state === write.state) continue;
            if (current) {
              const superseded = await transaction.attendanceRecord.updateMany({
                where: { id: current.id, supersededAt: null },
                data: { supersededAt: now },
              });
              if (superseded.count !== 1) throw new AttendanceConflictError();
            }
            const created = await transaction.attendanceRecord.create({
              data: { sessionId, studentId: write.studentId, state: write.state, recordedAt: now },
              select: { id: true },
            });
            await transaction.attendanceAudit.create({
              data: {
                sessionId,
                studentId: write.studentId,
                actorId: teacherId,
                previousRecordId: current?.id,
                newRecordId: created.id,
                previousState: current?.state,
                newState: write.state,
                action: current ? 'CORRECTED' : 'RECORDED',
                createdAt: now,
              },
            });
          }
          return 'SUCCESS';
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof AttendanceConflictError) return 'CONFLICT';
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      )
        return 'CONFLICT';
      throw error;
    }
  }
}
