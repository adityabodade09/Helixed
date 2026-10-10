import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationRepository } from './authorization.repository.js';
import type {
  AuthorizationDecision,
  AuthorizationRequest,
  RoleAssignment,
} from './authorization.types.js';

const platformRoles = new Set([
  'platform_admin',
  'security_admin',
  'safety_admin',
  'moderation_admin',
  'ai_admin',
  'support_admin',
  'analytics_admin',
]);

export class AuthorizationService {
  constructor(private readonly repository: AuthorizationRepository) {}

  async can(
    principal: AuthenticatedPrincipal,
    request: AuthorizationRequest,
  ): Promise<AuthorizationDecision> {
    const assignmentId = request.context?.roleAssignmentId;
    if (!assignmentId) return { allowed: false, reason: 'missing_context' };

    const now = new Date();
    const assignment = await this.repository.findActiveRoleAssignment(
      principal.userId,
      assignmentId,
      now,
    );
    if (!assignment) return { allowed: false, reason: 'inactive_assignment' };

    const permission = `${request.resource.type}:${request.action}`;
    if (!assignment.permissions.includes(permission)) {
      return { allowed: false, reason: 'missing_permission' };
    }

    const allowed = await this.withinScope(principal.userId, assignment, request, now);
    return { allowed, reason: allowed ? 'allowed' : 'outside_scope' };
  }

  private async withinScope(
    userId: string,
    assignment: RoleAssignment,
    request: AuthorizationRequest,
    now: Date,
  ): Promise<boolean> {
    const { resource } = request;

    if (assignment.role === 'student') {
      if (
        ![
          'student',
          'student_dashboard',
          'student_academics',
          'student_activities',
          'student_calendar',
          'student_community',
          'student_growth',
          'student_opportunities',
          'student_ai',
          'student_profile',
        ].includes(resource.type) ||
        resource.id !== userId
      ) {
        return false;
      }
      if (assignment.scope === 'platform') return true;
      return assignment.scope === 'school' && !!assignment.schoolId
        ? this.repository.isActiveSchoolMember(userId, assignment.schoolId, now)
        : false;
    }

    if (assignment.role === 'parent') {
      if (
        resource.type === 'parent_messages' ||
        ((resource.type === 'parent_approvals' || resource.type === 'parent_settings') &&
          resource.id === userId)
      ) {
        return assignment.scope === 'platform' && resource.id === userId;
      }
      return (
        assignment.scope === 'platform' &&
        [
          'student',
          'parent_dashboard',
          'parent_academics',
          'parent_activities',
          'parent_calendar',
          'parent_growth',
          'parent_children',
          'parent_attendance',
          'parent_tasks',
          'parent_teachers',
          'parent_approvals',
          'parent_insights',
          'parent_documents',
          'parent_opportunities',
        ].includes(resource.type) &&
        this.repository.hasVerifiedParentRelationship(userId, resource.id)
      );
    }

    if (assignment.role === 'teacher') {
      if (
        assignment.scope !== 'school' ||
        !assignment.schoolId ||
        !(await this.repository.isActiveSchoolMember(userId, assignment.schoolId, now))
      ) {
        return false;
      }
      if (resource.type === 'teacher_dashboard') {
        return resource.id === userId;
      }
      if (resource.type === 'teacher_classes') {
        const classId = request.context?.classId;
        return classId
          ? resource.id === classId &&
              this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now)
          : resource.id === userId;
      }
      if (resource.type === 'teacher_students') {
        const classId = request.context?.classId;
        const studentId = request.context?.studentId;
        if (studentId) {
          return (
            resource.id === studentId &&
            this.repository.isTeacherAssignedToStudent(
              userId,
              studentId,
              assignment.schoolId,
              undefined,
              now,
            )
          );
        }
        return classId
          ? resource.id === userId &&
              this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now)
          : resource.id === userId;
      }
      if (resource.type === 'teacher_attendance') {
        const classId = request.context?.classId;
        const sessionId = request.context?.sessionId;
        if (!classId) return resource.id === userId;
        if (sessionId ? resource.id !== sessionId : resource.id !== userId) return false;
        return this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now);
      }
      if (resource.type === 'teacher_assignments') {
        const classId = request.context?.classId;
        return classId
          ? resource.id === userId &&
              this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now)
          : resource.id === userId;
      }
      if (resource.type === 'teacher_marks') {
        const classId = request.context?.classId;
        const assessmentId = request.context?.assessmentId;
        if (!classId) return resource.id === userId;
        if (assessmentId ? resource.id !== assessmentId : resource.id !== userId) return false;
        return this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now);
      }
      if (resource.type === 'teacher_class_summary') {
        const classId = request.context?.classId;
        return !!classId && resource.id === classId
          ? this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now)
          : false;
      }
      if (resource.type === 'teacher_development') {
        const classId = request.context?.classId;
        const studentId = request.context?.studentId;
        if (resource.id !== userId) return false;
        if (!classId) return !studentId;
        return studentId
          ? this.repository.isTeacherAssignedToStudent(
              userId,
              studentId,
              assignment.schoolId,
              classId,
              now,
            )
          : this.repository.isTeacherAssignedToClass(userId, classId, assignment.schoolId, now);
      }
      if (
        resource.type === 'teacher_opportunities' ||
        resource.type === 'teacher_messages' ||
        resource.type === 'teacher_settings'
      ) {
        return resource.id === userId;
      }
      if (resource.type === 'class') {
        return this.repository.isTeacherAssignedToClass(
          userId,
          resource.id,
          assignment.schoolId,
          now,
        );
      }
      if (resource.type === 'student') {
        return this.repository.isTeacherAssignedToStudent(
          userId,
          resource.id,
          assignment.schoolId,
          request.context?.classId,
          now,
        );
      }
      return false;
    }

    if (assignment.role === 'academy_coach') {
      if (
        assignment.scope !== 'academy' ||
        !assignment.academyId ||
        !(await this.repository.isActiveAcademyMember(userId, assignment.academyId, now))
      ) {
        return false;
      }
      if (resource.type === 'batch') {
        return this.repository.isCoachAssignedToBatch(
          userId,
          resource.id,
          assignment.academyId,
          now,
        );
      }
      if (resource.type === 'student') {
        return this.repository.isCoachAssignedToStudent(
          userId,
          resource.id,
          assignment.academyId,
          now,
        );
      }
      return resource.type === 'academy' && resource.id === assignment.academyId;
    }

    if (assignment.role === 'school_admin') {
      return this.withinSchool(userId, assignment, request, now);
    }

    if (assignment.role === 'academy_owner' || assignment.role === 'academy_admin') {
      return this.withinAcademy(userId, assignment, request, now);
    }

    return (
      platformRoles.has(assignment.role) &&
      assignment.scope === 'platform' &&
      resource.type === 'platform'
    );
  }

  private async withinSchool(
    userId: string,
    assignment: RoleAssignment,
    request: AuthorizationRequest,
    now: Date,
  ): Promise<boolean> {
    return (
      assignment.scope === 'school' &&
      !!assignment.schoolId &&
      (await this.repository.isActiveSchoolMember(userId, assignment.schoolId, now)) &&
      this.repository.isResourceInSchool(request.resource, assignment.schoolId, now)
    );
  }

  private async withinAcademy(
    userId: string,
    assignment: RoleAssignment,
    request: AuthorizationRequest,
    now: Date,
  ): Promise<boolean> {
    const withinAcademy =
      assignment.scope === 'academy' &&
      !!assignment.academyId &&
      (await this.repository.isActiveAcademyMember(userId, assignment.academyId, now)) &&
      (await this.repository.isResourceInAcademy(request.resource, assignment.academyId, now));
    if (!withinAcademy || !assignment.academyId) return false;
    return (request.resource.type === 'academy_students' ||
      request.resource.type === 'academy_batches') &&
      request.context?.batchId
      ? this.repository.isResourceInAcademy(
          { type: 'batch', id: request.context.batchId },
          assignment.academyId,
          now,
        )
      : true;
  }
}
