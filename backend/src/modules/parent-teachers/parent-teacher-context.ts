import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export type ParentTeacherContext = {
  teacherId: string;
  teacherName: string;
  childId: string;
  childName: string;
  className: string;
  schoolName: string;
};

const activeAt = (now: Date) => ({
  revokedAt: null,
  activeFrom: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export async function findParentTeacherContexts(
  parentId: string,
  now: Date,
  db: PrismaClient = prisma,
): Promise<ParentTeacherContext[]> {
  const relationships = await db.parentStudentRelationship.findMany({
    where: { parentId, verifiedAt: { not: null }, revokedAt: null },
    select: {
      student: {
        select: {
          id: true,
          displayName: true,
          classMemberships: {
            where: activeAt(now),
            select: {
              schoolClass: {
                select: {
                  name: true,
                  schoolId: true,
                  school: { select: { name: true } },
                  teacherAssignments: {
                    where: activeAt(now),
                    select: {
                      teacher: {
                        select: {
                          id: true,
                          displayName: true,
                          accountState: true,
                          roleAssignments: {
                            where: { roleCode: 'TEACHER', scopeType: 'SCHOOL', ...activeAt(now) },
                            select: { schoolId: true },
                          },
                          schoolMemberships: {
                            where: { verifiedAt: { not: null }, ...activeAt(now) },
                            select: { schoolId: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const contexts: ParentTeacherContext[] = [];
  for (const relationship of relationships) {
    for (const membership of relationship.student.classMemberships) {
      const schoolClass = membership.schoolClass;
      for (const assignment of schoolClass.teacherAssignments) {
        const teacher = assignment.teacher;
        if (
          teacher.accountState !== 'ACTIVE' ||
          !teacher.roleAssignments.some((role) => role.schoolId === schoolClass.schoolId) ||
          !teacher.schoolMemberships.some((school) => school.schoolId === schoolClass.schoolId)
        )
          continue;
        contexts.push({
          teacherId: teacher.id,
          teacherName: teacher.displayName ?? 'Teacher',
          childId: relationship.student.id,
          childName: relationship.student.displayName ?? 'Student',
          className: schoolClass.name,
          schoolName: schoolClass.school.name,
        });
      }
    }
  }
  return contexts;
}
