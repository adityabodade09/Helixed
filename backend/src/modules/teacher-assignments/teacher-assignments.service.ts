import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type {
  AssignmentFilters,
  TeacherAssignmentsRepository,
} from './teacher-assignments.repository.js';
import type {
  CreateAssignmentInput,
  TeacherAssignment,
  TeacherAssignments,
} from './teacher-assignments.types.js';

const activeStatuses = new Set(['SCHEDULED', 'PUBLISHED', 'OPEN']);

export class TeacherAssignmentsService {
  constructor(
    private readonly repository: TeacherAssignmentsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    filters: AssignmentFilters,
  ): Promise<TeacherAssignments> {
    const now = new Date();
    const role = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!role) throw this.unavailable();
    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_assignments', id: principal.userId },
      context: {
        roleAssignmentId: role.id,
        ...(filters.classId ? { classId: filters.classId } : {}),
      },
    });
    if (!decision.allowed) throw this.unavailable();
    const record = await this.repository.list(principal.userId, role.schoolId, now, filters);
    if (!record) throw this.unavailable();

    const assignments = record.classes.flatMap((schoolClass) =>
      schoolClass.assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        class: { id: schoolClass.id, name: schoolClass.name },
        subjectName: assignment.subjectName,
        dueAt: assignment.dueAt?.toISOString() ?? null,
        status: assignment.status,
        createdAt: assignment.createdAt.toISOString(),
      })),
    );
    const weekEnd = new Date(now);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    return {
      teacher: { id: record.teacher.id, displayName: record.teacher.displayName ?? 'Teacher' },
      school: record.school,
      classes: record.classes.map(({ id, name, subjects }) => ({ id, name, subjects })),
      summary: {
        total: assignments.length,
        active: assignments.filter(({ status }) => activeStatuses.has(status)).length,
        dueThisWeek: assignments.filter(
          ({ dueAt, status }) =>
            dueAt && new Date(dueAt) >= now && new Date(dueAt) < weekEnd && status !== 'CLOSED',
        ).length,
      },
      assignments,
    };
  }

  async create(
    principal: AuthenticatedPrincipal,
    input: CreateAssignmentInput,
  ): Promise<TeacherAssignment> {
    const now = new Date();
    const role = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!role) throw this.unavailable();
    const decision = await this.authorization.can(principal, {
      action: 'create',
      resource: { type: 'teacher_assignments', id: principal.userId },
      context: { roleAssignmentId: role.id, classId: input.classId },
    });
    if (!decision.allowed) throw this.unavailable();
    const assignment = await this.repository.create(principal.userId, role.schoolId, now, input);
    if (!assignment) throw this.unavailable();
    return assignment;
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Teacher assignments are unavailable.');
  }
}
