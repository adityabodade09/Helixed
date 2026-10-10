import type { AuthorizationResource, RoleAssignment } from './authorization.types.js';

export interface AuthorizationRepository {
  findActiveRoleAssignment(
    userId: string,
    assignmentId: string,
    now: Date,
  ): Promise<RoleAssignment | null>;
  isActiveSchoolMember(userId: string, schoolId: string, now: Date): Promise<boolean>;
  isActiveAcademyMember(userId: string, academyId: string, now: Date): Promise<boolean>;
  hasVerifiedParentRelationship(parentId: string, studentId: string): Promise<boolean>;
  isTeacherAssignedToClass(
    teacherId: string,
    classId: string,
    schoolId: string,
    now: Date,
  ): Promise<boolean>;
  isTeacherAssignedToStudent(
    teacherId: string,
    studentId: string,
    schoolId: string,
    classId: string | undefined,
    now: Date,
  ): Promise<boolean>;
  isResourceInSchool(
    resource: AuthorizationResource,
    schoolId: string,
    now: Date,
  ): Promise<boolean>;
  isResourceInAcademy(
    resource: AuthorizationResource,
    academyId: string,
    now: Date,
  ): Promise<boolean>;
  isCoachAssignedToBatch(
    coachId: string,
    batchId: string,
    academyId: string,
    now: Date,
  ): Promise<boolean>;
  isCoachAssignedToStudent(
    coachId: string,
    studentId: string,
    academyId: string,
    now: Date,
  ): Promise<boolean>;
}
