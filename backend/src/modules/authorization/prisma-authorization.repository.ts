import type { AuthorizationScope, PrismaClient, RoleCode } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { AuthorizationRepository } from './authorization.repository.js';
import type {
  AuthorizationResource,
  AuthorizationScope as Scope,
  Role,
  RoleAssignment,
} from './authorization.types.js';

function activeAt(now: Date) {
  return {
    revokedAt: null,
    activeFrom: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

function roleName(role: RoleCode): Role {
  return role.toLowerCase() as Role;
}

function scopeName(scope: AuthorizationScope): Scope {
  return scope.toLowerCase() as Scope;
}

export class PrismaAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findActiveRoleAssignment(
    userId: string,
    assignmentId: string,
    now: Date,
  ): Promise<RoleAssignment | null> {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: { id: assignmentId, userId, ...activeAt(now) },
      include: {
        role: { include: { permissions: { select: { permissionKey: true } } } },
      },
    });

    return assignment
      ? {
          id: assignment.id,
          role: roleName(assignment.roleCode),
          scope: scopeName(assignment.scopeType),
          schoolId: assignment.schoolId,
          academyId: assignment.academyId,
          permissions: assignment.role.permissions.map(({ permissionKey }) => permissionKey),
        }
      : null;
  }

  async isActiveSchoolMember(userId: string, schoolId: string, now: Date): Promise<boolean> {
    return !!(await this.db.schoolMembership.findFirst({
      where: {
        userId,
        schoolId,
        verifiedAt: { not: null },
        school: { verifiedAt: { not: null } },
        ...activeAt(now),
      },
      select: { id: true },
    }));
  }

  async isActiveAcademyMember(userId: string, academyId: string, now: Date): Promise<boolean> {
    return !!(await this.db.academyMembership.findFirst({
      where: {
        userId,
        academyId,
        verifiedAt: { not: null },
        academy: { verifiedAt: { not: null } },
        ...activeAt(now),
      },
      select: { id: true },
    }));
  }

  async hasVerifiedParentRelationship(parentId: string, studentId: string): Promise<boolean> {
    return !!(await this.db.parentStudentRelationship.findFirst({
      where: { parentId, studentId, verifiedAt: { not: null }, revokedAt: null },
      select: { id: true },
    }));
  }

  async isTeacherAssignedToClass(
    teacherId: string,
    classId: string,
    schoolId: string,
    now: Date,
  ): Promise<boolean> {
    return !!(await this.db.teacherClassAssignment.findFirst({
      where: {
        teacherId,
        classId,
        schoolClass: { schoolId },
        ...activeAt(now),
      },
      select: { id: true },
    }));
  }

  async isTeacherAssignedToStudent(
    teacherId: string,
    studentId: string,
    schoolId: string,
    classId: string | undefined,
    now: Date,
  ): Promise<boolean> {
    return !!(await this.db.teacherClassAssignment.findFirst({
      where: {
        teacherId,
        ...(classId ? { classId } : {}),
        ...activeAt(now),
        schoolClass: {
          schoolId,
          studentMemberships: {
            some: { studentId, ...activeAt(now) },
          },
        },
      },
      select: { id: true },
    }));
  }

  async isResourceInSchool(
    resource: AuthorizationResource,
    schoolId: string,
    now: Date,
  ): Promise<boolean> {
    if (resource.type === 'school') {
      return (
        resource.id === schoolId &&
        !!(await this.db.school.findFirst({
          where: { id: schoolId, verifiedAt: { not: null } },
          select: { id: true },
        }))
      );
    }
    if (resource.type === 'class') {
      return !!(await this.db.schoolClass.findFirst({
        where: { id: resource.id, schoolId },
        select: { id: true },
      }));
    }
    return resource.type === 'student'
      ? this.isActiveSchoolMember(resource.id, schoolId, now)
      : false;
  }

  async isResourceInAcademy(
    resource: AuthorizationResource,
    academyId: string,
    now: Date,
  ): Promise<boolean> {
    if (
      resource.type === 'academy' ||
      resource.type === 'academy_dashboard' ||
      resource.type === 'academy_students' ||
      resource.type === 'academy_batches' ||
      resource.type === 'academy_coaches' ||
      resource.type === 'academy_settings'
    ) {
      return (
        resource.id === academyId &&
        !!(await this.db.academy.findFirst({
          where: { id: academyId, verifiedAt: { not: null } },
          select: { id: true },
        }))
      );
    }
    if (resource.type === 'batch') {
      return !!(await this.db.academyBatch.findFirst({
        where: { id: resource.id, academyId },
        select: { id: true },
      }));
    }
    if (resource.type !== 'student') return false;

    return !!(await this.db.academyStudentEnrollment.findFirst({
      where: { studentId: resource.id, academyId, ...activeAt(now) },
      select: { id: true },
    }));
  }

  async isCoachAssignedToBatch(
    coachId: string,
    batchId: string,
    academyId: string,
    now: Date,
  ): Promise<boolean> {
    return !!(await this.db.batchCoachAssignment.findFirst({
      where: { coachId, batchId, batch: { academyId }, ...activeAt(now) },
      select: { id: true },
    }));
  }

  async isCoachAssignedToStudent(
    coachId: string,
    studentId: string,
    academyId: string,
    now: Date,
  ): Promise<boolean> {
    return !!(await this.db.batchCoachAssignment.findFirst({
      where: {
        coachId,
        ...activeAt(now),
        batch: {
          academyId,
          studentMemberships: {
            some: {
              ...activeAt(now),
              enrollment: { studentId, academyId, ...activeAt(now) },
            },
          },
        },
      },
      select: { id: true },
    }));
  }
}
