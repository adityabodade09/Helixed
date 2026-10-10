import type { AuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js';
import type {
  AuthorizationResource,
  RoleAssignment,
} from '../../src/modules/authorization/authorization.types.js';

export interface TestRoleAssignment extends RoleAssignment {
  userId: string;
}

export class InMemoryAuthorizationRepository implements AuthorizationRepository {
  assignments: TestRoleAssignment[] = [];
  schoolMembers = new Set<string>();
  academyMembers = new Set<string>();
  parentRelationships = new Set<string>();
  teacherClasses = new Set<string>();
  teacherStudents = new Set<string>();
  schoolResources = new Set<string>();
  academyResources = new Set<string>();
  coachBatches = new Set<string>();
  coachStudents = new Set<string>();

  async findActiveRoleAssignment(
    userId: string,
    assignmentId: string,
    _now: Date,
  ): Promise<RoleAssignment | null> {
    return (
      this.assignments.find(
        ({ id, userId: ownerId }) => id === assignmentId && ownerId === userId,
      ) ?? null
    );
  }

  async isActiveSchoolMember(userId: string, schoolId: string, _now: Date): Promise<boolean> {
    return this.schoolMembers.has(`${userId}:${schoolId}`);
  }

  async isActiveAcademyMember(userId: string, academyId: string, _now: Date): Promise<boolean> {
    return this.academyMembers.has(`${userId}:${academyId}`);
  }

  async hasVerifiedParentRelationship(parentId: string, studentId: string): Promise<boolean> {
    return this.parentRelationships.has(`${parentId}:${studentId}`);
  }

  async isTeacherAssignedToClass(
    teacherId: string,
    classId: string,
    schoolId: string,
    _now: Date,
  ): Promise<boolean> {
    return this.teacherClasses.has(`${teacherId}:${schoolId}:${classId}`);
  }

  async isTeacherAssignedToStudent(
    teacherId: string,
    studentId: string,
    schoolId: string,
    classId: string | undefined,
    _now: Date,
  ): Promise<boolean> {
    const prefix = `${teacherId}:${schoolId}:${studentId}:`;
    return classId
      ? this.teacherStudents.has(`${prefix}${classId}`)
      : [...this.teacherStudents].some((value) => value.startsWith(prefix));
  }

  async isResourceInSchool(
    resource: AuthorizationResource,
    schoolId: string,
    _now: Date,
  ): Promise<boolean> {
    return this.schoolResources.has(`${schoolId}:${resource.type}:${resource.id}`);
  }

  async isResourceInAcademy(
    resource: AuthorizationResource,
    academyId: string,
    _now: Date,
  ): Promise<boolean> {
    return this.academyResources.has(`${academyId}:${resource.type}:${resource.id}`);
  }

  async isCoachAssignedToBatch(
    coachId: string,
    batchId: string,
    academyId: string,
    _now: Date,
  ): Promise<boolean> {
    return this.coachBatches.has(`${coachId}:${academyId}:${batchId}`);
  }

  async isCoachAssignedToStudent(
    coachId: string,
    studentId: string,
    academyId: string,
    _now: Date,
  ): Promise<boolean> {
    return this.coachStudents.has(`${coachId}:${academyId}:${studentId}`);
  }
}
