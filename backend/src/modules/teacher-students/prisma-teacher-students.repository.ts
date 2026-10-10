import { RoleCode, type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { TeacherStudentsRepository } from './teacher-students.repository.js';

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export class PrismaTeacherStudentsRepository implements TeacherStudentsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findTeacherRoleAssignment(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: RoleCode.TEACHER,
        scopeType: 'SCHOOL',
        schoolId: { not: null },
        ...activeAt(now),
      },
      select: { id: true, schoolId: true },
    });
    return assignment?.schoolId ? { id: assignment.id, schoolId: assignment.schoolId } : null;
  }

  async listStudents(teacherId: string, schoolId: string, now: Date, classId?: string) {
    const teacher = await this.db.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        displayName: true,
        teacherClassAssignments: {
          where: { ...activeAt(now), ...(classId ? { classId } : {}), schoolClass: { schoolId } },
          select: {
            schoolClass: {
              select: {
                id: true,
                name: true,
                attendanceSessions: { select: { subjectName: true } },
                studentMemberships: {
                  where: {
                    ...activeAt(now),
                    student: {
                      roleAssignments: {
                        some: { roleCode: RoleCode.STUDENT, ...activeAt(now) },
                      },
                    },
                  },
                  select: { student: { select: { id: true, displayName: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!teacher) return null;
    const school = await this.db.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });
    if (!school) return null;

    const students = new Map<
      string,
      {
        id: string;
        displayName: string | null;
        classes: { id: string; name: string; subjects: string[] }[];
      }
    >();
    for (const { schoolClass } of teacher.teacherClassAssignments) {
      const context = {
        id: schoolClass.id,
        name: schoolClass.name,
        subjects: [
          ...new Set(schoolClass.attendanceSessions.map(({ subjectName }) => subjectName)),
        ],
      };
      for (const { student } of schoolClass.studentMemberships) {
        const existing = students.get(student.id);
        if (existing) existing.classes.push(context);
        else
          students.set(student.id, {
            id: student.id,
            displayName: student.displayName,
            classes: [context],
          });
      }
    }

    return { teacher, school, students: [...students.values()] };
  }

  async findStudentDetail(teacherId: string, studentId: string, schoolId: string, now: Date) {
    const [teacher, school, student] = await Promise.all([
      this.db.user.findUnique({
        where: { id: teacherId },
        select: { id: true, displayName: true },
      }),
      this.db.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true },
      }),
      this.db.user.findFirst({
        where: {
          id: studentId,
          roleAssignments: { some: { roleCode: RoleCode.STUDENT, ...activeAt(now) } },
          classMemberships: {
            some: {
              ...activeAt(now),
              schoolClass: {
                schoolId,
                teacherAssignments: { some: { teacherId, ...activeAt(now) } },
              },
            },
          },
        },
        select: {
          id: true,
          displayName: true,
          classMemberships: {
            where: {
              ...activeAt(now),
              schoolClass: {
                schoolId,
                teacherAssignments: { some: { teacherId, ...activeAt(now) } },
              },
            },
            select: {
              schoolClass: {
                select: {
                  id: true,
                  name: true,
                  attendanceSessions: {
                    where: { state: 'COMPLETED', startsAt: { lte: now } },
                    orderBy: { startsAt: 'desc' },
                    take: 24,
                    select: {
                      id: true,
                      subjectName: true,
                      startsAt: true,
                      endsAt: true,
                      records: {
                        where: { studentId, supersededAt: null },
                        orderBy: { recordedAt: 'desc' },
                        take: 1,
                        select: { state: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);
    if (!teacher || !school || !student) return null;
    return {
      teacher,
      school,
      student: {
        id: student.id,
        displayName: student.displayName,
        classes: student.classMemberships.map(({ schoolClass }) => ({
          id: schoolClass.id,
          name: schoolClass.name,
          sessions: schoolClass.attendanceSessions,
        })),
      },
    };
  }
}
