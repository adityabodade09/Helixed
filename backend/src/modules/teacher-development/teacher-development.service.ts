import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { TeacherDevelopmentRepository } from './teacher-development.repository.js';
import type { TeacherDevelopment } from './teacher-development.types.js';

export class TeacherDevelopmentService {
  constructor(
    private readonly repository: TeacherDevelopmentRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(
    principal: AuthenticatedPrincipal,
    filters: { classId?: string; studentId?: string },
  ): Promise<TeacherDevelopment> {
    const now = new Date();
    const role = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!role) throw this.unavailable();
    const initialDecision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_development', id: principal.userId },
      context: { roleAssignmentId: role.id, ...filters },
    });
    if (!initialDecision.allowed) throw this.unavailable();
    const scope = await this.repository.findScope(principal.userId, role.schoolId, now);
    if (!scope) throw this.unavailable();

    const schoolClass = filters.classId
      ? scope.classes.find(({ id }) => id === filters.classId)
      : scope.classes[0];
    if (filters.classId && !schoolClass) throw this.unavailable();
    const student = filters.studentId
      ? schoolClass?.students.find(({ id }) => id === filters.studentId)
      : schoolClass?.students[0];
    if (filters.studentId && !student) throw this.unavailable();

    const classes = scope.classes.map((item) => ({
      id: item.id,
      name: item.name,
      students: item.students.map((candidate) => ({
        id: candidate.id,
        displayName: candidate.displayName ?? 'Student',
      })),
    }));
    const empty = this.empty(scope, classes);
    if (!schoolClass || !student) return empty;

    const exactDecision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_development', id: principal.userId },
      context: { roleAssignmentId: role.id, classId: schoolClass.id, studentId: student.id },
    });
    if (!exactDecision.allowed) throw this.unavailable();
    const evidence = await this.repository.findEvidence(
      principal.userId,
      role.schoolId,
      schoolClass.id,
      student.id,
      now,
    );
    if (!evidence) throw this.unavailable();

    const attendanceStates = evidence.attendanceSessions.map(({ state }) => state);
    const knownStates = attendanceStates.filter((state) => state !== null);
    const count = (state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL') =>
      knownStates.filter((value) => value === state).length;
    const assessments = evidence.assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      subjectName: assessment.subjectName,
      maximumMarks: assessment.maximumMarks,
      assessedAt: assessment.assessedAt.toISOString(),
      mark: assessment.mark?.value ?? null,
      normalizedPercent:
        assessment.mark === null
          ? null
          : Math.round((assessment.mark.value / assessment.maximumMarks) * 100),
    }));
    const recorded = assessments.filter(({ mark }) => mark !== null);

    return {
      ...empty,
      selection: {
        class: { id: evidence.schoolClass.id, name: evidence.schoolClass.name },
        student: {
          id: evidence.student.id,
          displayName: evidence.student.displayName ?? 'Student',
        },
      },
      attendance: {
        known: knownStates.length,
        missing: attendanceStates.length - knownStates.length,
        present: count('PRESENT'),
        absent: count('ABSENT'),
        late: count('LATE'),
        partial: count('PARTIAL'),
        presentRate: knownStates.length
          ? Math.round((count('PRESENT') / knownStates.length) * 100)
          : null,
        sessions: evidence.attendanceSessions.map((session) => ({
          ...session,
          startsAt: session.startsAt.toISOString(),
        })),
      },
      assessments: {
        recorded: recorded.length,
        missing: assessments.length - recorded.length,
        normalizedAverage: recorded.length
          ? Math.round(
              recorded.reduce((sum, item) => sum + item.normalizedPercent!, 0) / recorded.length,
            )
          : null,
        items: assessments,
      },
      classAssignments: {
        attribution: 'CLASS_CONTEXT_ONLY',
        items: evidence.assignments.map((assignment) => ({
          ...assignment,
          dueAt: assignment.dueAt?.toISOString() ?? null,
        })),
      },
    };
  }

  private empty(
    scope: {
      teacher: { id: string; displayName: string | null };
      school: { id: string; name: string };
    },
    classes: TeacherDevelopment['classes'],
  ): TeacherDevelopment {
    return {
      teacher: { id: scope.teacher.id, displayName: scope.teacher.displayName ?? 'Teacher' },
      school: scope.school,
      classes,
      selection: null,
      attendance: {
        known: 0,
        missing: 0,
        present: 0,
        absent: 0,
        late: 0,
        partial: 0,
        presentRate: null,
        sessions: [],
      },
      assessments: { recorded: 0, missing: 0, normalizedAverage: null, items: [] },
      classAssignments: { attribution: 'CLASS_CONTEXT_ONLY', items: [] },
      activityEvidence: { available: false },
    };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Teacher development is unavailable.');
  }
}
