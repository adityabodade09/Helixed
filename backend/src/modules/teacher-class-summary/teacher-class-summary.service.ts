import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { TeacherClassSummaryRepository } from './teacher-class-summary.repository.js';
import type { TeacherClassSummary } from './teacher-class-summary.types.js';

const activeAssignmentStatuses = new Set(['SCHEDULED', 'PUBLISHED', 'OPEN']);

export class TeacherClassSummaryService {
  constructor(
    private readonly repository: TeacherClassSummaryRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal, classId: string): Promise<TeacherClassSummary> {
    const now = new Date();
    const role = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!role) throw this.unavailable();
    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_class_summary', id: classId },
      context: { roleAssignmentId: role.id, classId },
    });
    if (!decision.allowed) throw this.unavailable();
    const record = await this.repository.findClassSummary(
      principal.userId,
      role.schoolId,
      classId,
      now,
    );
    if (!record) throw this.unavailable();

    const activeStudents = new Set(record.schoolClass.studentIds);
    const completedSessions = record.schoolClass.sessions.filter(
      ({ state }) => state === 'COMPLETED',
    );
    const attendanceRecords = completedSessions.flatMap(({ records }) =>
      records.filter(({ studentId }) => activeStudents.has(studentId)),
    );
    const countAttendance = (state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL') =>
      attendanceRecords.filter((record) => record.state === state).length;
    const eligibleRecords = completedSessions.length * activeStudents.size;
    const present = countAttendance('PRESENT');

    const weekEnd = new Date(now);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const assignments = record.schoolClass.assignments;
    const activeAssignments = assignments.filter(({ status }) =>
      activeAssignmentStatuses.has(status),
    );

    const assessments = record.schoolClass.assessments.map((assessment) => {
      const currentMarks = assessment.marks.filter(({ studentId }) =>
        activeStudents.has(studentId),
      );
      const normalized = currentMarks.map(({ value }) => (value / assessment.maximumMarks) * 100);
      return {
        id: assessment.id,
        title: assessment.title,
        subjectName: assessment.subjectName,
        maximumMarks: assessment.maximumMarks,
        assessedAt: assessment.assessedAt.toISOString(),
        recordedCount: currentMarks.length,
        missingCount: Math.max(0, activeStudents.size - currentMarks.length),
        normalizedAverage: normalized.length
          ? Math.round(normalized.reduce((sum, value) => sum + value, 0) / normalized.length)
          : null,
        normalized,
      };
    });
    const allNormalizedMarks = assessments.flatMap(({ normalized }) => normalized);
    const nextSession = record.schoolClass.sessions
      .filter(({ state, startsAt }) => state === 'SCHEDULED' && startsAt >= now)
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0];

    return {
      teacher: { id: record.teacher.id, displayName: record.teacher.displayName ?? 'Teacher' },
      school: record.school,
      class: {
        id: record.schoolClass.id,
        name: record.schoolClass.name,
        studentCount: activeStudents.size,
      },
      nextSession: nextSession
        ? {
            subjectName: nextSession.subjectName,
            startsAt: nextSession.startsAt.toISOString(),
            endsAt: nextSession.endsAt.toISOString(),
          }
        : null,
      attendance: {
        completedSessions: completedSessions.length,
        eligibleRecords,
        knownRecords: attendanceRecords.length,
        missingRecords: Math.max(0, eligibleRecords - attendanceRecords.length),
        present,
        absent: countAttendance('ABSENT'),
        late: countAttendance('LATE'),
        partial: countAttendance('PARTIAL'),
        presentRate: attendanceRecords.length
          ? Math.round((present / attendanceRecords.length) * 100)
          : null,
      },
      assignments: {
        total: assignments.length,
        active: activeAssignments.length,
        dueSoon: activeAssignments.filter(({ dueAt }) => dueAt && dueAt >= now && dueAt < weekEnd)
          .length,
        items: assignments.map((assignment) => ({
          ...assignment,
          dueAt: assignment.dueAt?.toISOString() ?? null,
        })),
      },
      assessments: {
        total: assessments.length,
        recordedMarks: assessments.reduce((sum, item) => sum + item.recordedCount, 0),
        missingMarks: assessments.reduce((sum, item) => sum + item.missingCount, 0),
        normalizedAverage: allNormalizedMarks.length
          ? Math.round(
              allNormalizedMarks.reduce((sum, value) => sum + value, 0) / allNormalizedMarks.length,
            )
          : null,
        items: assessments.map(({ normalized: _normalized, ...assessment }) => assessment),
      },
    };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Class summary is unavailable.');
  }
}
