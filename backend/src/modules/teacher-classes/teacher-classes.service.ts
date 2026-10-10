import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { TeacherDashboardRepository } from '../teacher-dashboard/teacher-dashboard.repository.js';
import type { TeacherDashboardRecord } from '../teacher-dashboard/teacher-dashboard.types.js';
import type { TeacherClass, TeacherClassDetail, TeacherClasses } from './teacher-classes.types.js';

export class TeacherClassesService {
  constructor(
    private readonly repository: TeacherDashboardRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(principal: AuthenticatedPrincipal, search?: string): Promise<TeacherClasses> {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw new AppError(403, 'FORBIDDEN', 'Teacher classes are unavailable.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_classes', id: principal.userId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw new AppError(403, 'FORBIDDEN', 'Teacher classes are unavailable.');

    const record = await this.repository.dashboard(principal.userId, assignment.schoolId, now);
    if (!record) throw new AppError(403, 'FORBIDDEN', 'Teacher classes are unavailable.');

    const normalizedSearch = search?.trim().toLowerCase();
    const classes = record.classes
      .map((schoolClass) => this.classSummary(schoolClass, now))
      .filter(
        (schoolClass) =>
          !normalizedSearch ||
          `${schoolClass.name} ${schoolClass.subjects.join(' ')}`
            .toLowerCase()
            .includes(normalizedSearch),
      );

    return {
      teacher: { id: record.teacher.id, displayName: record.teacher.displayName ?? 'Teacher' },
      school: record.school,
      classes,
    };
  }

  async detail(principal: AuthenticatedPrincipal, classId: string): Promise<TeacherClassDetail> {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw new AppError(403, 'FORBIDDEN', 'Class access is unavailable.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_classes', id: classId },
      context: { roleAssignmentId: assignment.id, classId },
    });
    if (!decision.allowed) throw new AppError(403, 'FORBIDDEN', 'Class access is unavailable.');

    const record = await this.repository.dashboard(principal.userId, assignment.schoolId, now);
    if (!record) throw new AppError(403, 'FORBIDDEN', 'Class access is unavailable.');
    const schoolClass = record.classes.find((candidate) => candidate.id === classId);
    if (!schoolClass) throw new AppError(403, 'FORBIDDEN', 'Class access is unavailable.');

    return {
      ...this.classSummary(schoolClass, now),
      school: record.school,
      recentSessions: schoolClass.sessions.map((session) => ({
        id: session.id,
        subjectName: session.subjectName,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        state: session.state,
        knownAttendanceCount: session.records.length,
        missingAttendanceCount: Math.max(0, schoolClass.studentIds.length - session.records.length),
        absentAttendanceCount: session.records.filter(({ state }) => state === 'ABSENT').length,
      })),
    };
  }

  private classSummary(
    schoolClass: TeacherDashboardRecord['classes'][number],
    now: Date,
  ): TeacherClass {
    const sessions = schoolClass.sessions;
    const subjects = [...new Set(sessions.map(({ subjectName }) => subjectName))];
    const next = sessions
      .filter(({ state, startsAt }) => state === 'SCHEDULED' && startsAt >= now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
    return {
      id: schoolClass.id,
      name: schoolClass.name,
      subjects,
      studentCount: schoolClass.studentIds.length,
      openTaskCount: schoolClass.openTaskCount,
      attendanceRecordingPending: sessions.filter(
        ({ state, records }) =>
          state === 'COMPLETED' && records.length < schoolClass.studentIds.length,
      ).length,
      nextSession: next
        ? {
            subjectName: next.subjectName,
            startsAt: next.startsAt.toISOString(),
            endsAt: next.endsAt.toISOString(),
          }
        : null,
    };
  }
}
