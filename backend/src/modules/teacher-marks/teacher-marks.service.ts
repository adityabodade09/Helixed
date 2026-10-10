import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { MarksFilters, TeacherMarksRepository } from './teacher-marks.repository.js';
import type {
  MarkWrite,
  TeacherMarkAssessment,
  TeacherMarkAssessmentRecord,
  TeacherMarks,
} from './teacher-marks.types.js';

export class TeacherMarksService {
  constructor(
    private readonly repository: TeacherMarksRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(principal: AuthenticatedPrincipal, filters: MarksFilters): Promise<TeacherMarks> {
    const now = new Date();
    const role = await this.roleAssignment(principal, now);
    await this.authorize(principal, role.id, 'read', principal.userId, filters.classId);
    const record = await this.repository.list(principal.userId, role.schoolId, now, filters);
    if (!record) throw this.unavailable();

    const assessments = record.classes.flatMap((schoolClass) =>
      schoolClass.assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        class: { id: schoolClass.id, name: schoolClass.name },
        subjectName: assessment.subjectName,
        maximumMarks: assessment.maximumMarks,
        assessedAt: assessment.assessedAt.toISOString(),
        rosterCount: schoolClass.studentCount,
        recordedCount: assessment.recordedCount,
        missingCount: Math.max(0, schoolClass.studentCount - assessment.recordedCount),
      })),
    );
    const complete = assessments.filter(
      ({ rosterCount, recordedCount }) => rosterCount > 0 && rosterCount === recordedCount,
    ).length;
    return {
      teacher: { id: record.teacher.id, displayName: record.teacher.displayName ?? 'Teacher' },
      school: record.school,
      classes: record.classes.map(({ id, name }) => ({ id, name })),
      summary: {
        totalAssessments: assessments.length,
        complete,
        pendingEntry: assessments.length - complete,
      },
      assessments,
    };
  }

  async detail(
    principal: AuthenticatedPrincipal,
    assessmentId: string,
  ): Promise<TeacherMarkAssessment> {
    const now = new Date();
    const role = await this.roleAssignment(principal, now);
    const assessment = await this.repository.findAssessment(
      principal.userId,
      role.schoolId,
      assessmentId,
      now,
    );
    if (!assessment) throw this.unavailable();
    await this.authorize(
      principal,
      role.id,
      'read',
      assessmentId,
      assessment.schoolClass.id,
      assessmentId,
    );
    return this.assessmentDto(assessment);
  }

  async record(
    principal: AuthenticatedPrincipal,
    assessmentId: string,
    writes: MarkWrite[],
  ): Promise<TeacherMarkAssessment> {
    const now = new Date();
    const role = await this.roleAssignment(principal, now);
    const assessment = await this.repository.findAssessment(
      principal.userId,
      role.schoolId,
      assessmentId,
      now,
    );
    if (!assessment) throw this.unavailable();
    await this.authorize(
      principal,
      role.id,
      'update',
      assessmentId,
      assessment.schoolClass.id,
      assessmentId,
    );
    if (writes.some(({ value }) => value > assessment.maximumMarks)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A mark exceeds the assessment maximum.');
    }
    const result = await this.repository.record(
      principal.userId,
      role.schoolId,
      assessmentId,
      writes,
      now,
    );
    if (result === 'CONFLICT') {
      throw new AppError(
        409,
        'MARK_CONFLICT',
        'Marks changed since they were loaded. Refresh and try again.',
      );
    }
    if (result === 'OUT_OF_RANGE') {
      throw new AppError(400, 'VALIDATION_ERROR', 'A mark exceeds the assessment maximum.');
    }
    if (result === 'NOT_AVAILABLE') throw this.unavailable();
    const authoritative = await this.repository.findAssessment(
      principal.userId,
      role.schoolId,
      assessmentId,
      new Date(),
    );
    if (!authoritative) throw this.unavailable();
    return this.assessmentDto(authoritative);
  }

  private async roleAssignment(principal: AuthenticatedPrincipal, now: Date) {
    const role = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!role) throw this.unavailable();
    return role;
  }

  private async authorize(
    principal: AuthenticatedPrincipal,
    roleAssignmentId: string,
    action: 'read' | 'update',
    resourceId: string,
    classId?: string,
    assessmentId?: string,
  ) {
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'teacher_marks', id: resourceId },
      context: {
        roleAssignmentId,
        ...(classId ? { classId } : {}),
        ...(assessmentId ? { assessmentId } : {}),
      },
    });
    if (!decision.allowed) throw this.unavailable();
  }

  private assessmentDto(assessment: TeacherMarkAssessmentRecord): TeacherMarkAssessment {
    return {
      id: assessment.id,
      title: assessment.title,
      class: assessment.schoolClass,
      subjectName: assessment.subjectName,
      maximumMarks: assessment.maximumMarks,
      assessedAt: assessment.assessedAt.toISOString(),
      roster: assessment.students.map((student) => ({
        studentId: student.id,
        displayName: student.displayName ?? 'Student',
        mark: student.mark?.value ?? null,
        currentMarkId: student.mark?.id ?? null,
        recordedAt: student.mark?.recordedAt.toISOString() ?? null,
      })),
    };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Teacher marks are unavailable.');
  }
}
