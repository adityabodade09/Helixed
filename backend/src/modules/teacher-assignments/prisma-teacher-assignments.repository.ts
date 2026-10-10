import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type {
  AssignmentFilters,
  TeacherAssignmentsRepository,
} from './teacher-assignments.repository.js';
import type { CreateAssignmentInput } from './teacher-assignments.types.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherAssignmentsRepository implements TeacherAssignmentsRepository {
  constructor(private readonly db = prisma) {}

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

  async list(teacherId: string, schoolId: string, now: Date, filters: AssignmentFilters) {
    const assignmentWhere: Prisma.AssignmentWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { subjectName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
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
                attendanceSessions: { select: { subjectName: true } },
                assignments: {
                  where: assignmentWhere,
                  orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
                  select: {
                    id: true,
                    title: true,
                    subjectName: true,
                    dueAt: true,
                    status: true,
                    createdAt: true,
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
        ...schoolClass,
        subjects: [
          ...new Set(schoolClass.attendanceSessions.map(({ subjectName }) => subjectName)),
        ],
        attendanceSessions: undefined,
      })),
    };
  }

  async create(teacherId: string, schoolId: string, now: Date, input: CreateAssignmentInput) {
    return this.db.$transaction(async (tx) => {
      const schoolClass = await tx.schoolClass.findFirst({
        where: {
          id: input.classId,
          schoolId,
          teacherAssignments: { some: { teacherId, ...activeAt(now) } },
          attendanceSessions: {
            some: { subjectName: { equals: input.subjectName, mode: 'insensitive' } },
          },
        },
        select: {
          id: true,
          name: true,
          attendanceSessions: {
            where: { subjectName: { equals: input.subjectName, mode: 'insensitive' } },
            take: 1,
            select: { subjectName: true },
          },
        },
      });
      const subjectName = schoolClass?.attendanceSessions[0]?.subjectName;
      if (!schoolClass || !subjectName) return null;
      const assignment = await tx.assignment.create({
        data: {
          classId: schoolClass.id,
          createdById: teacherId,
          title: input.title,
          description: input.description,
          subjectName,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          status: input.status,
        },
        select: {
          id: true,
          title: true,
          subjectName: true,
          dueAt: true,
          status: true,
          createdAt: true,
        },
      });
      return {
        ...assignment,
        class: { id: schoolClass.id, name: schoolClass.name },
        dueAt: assignment.dueAt?.toISOString() ?? null,
        createdAt: assignment.createdAt.toISOString(),
      };
    });
  }
}
