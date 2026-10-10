import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { TeacherDashboardRepository } from './teacher-dashboard.repository.js';
import type {
  TeacherDashboard,
  TeacherDashboardRecord,
  TeacherSession,
} from './teacher-dashboard.types.js';

export class TeacherDashboardService {
  constructor(
    private readonly repository: TeacherDashboardRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal): Promise<TeacherDashboard> {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment)
      throw new AppError(403, 'FORBIDDEN', 'Teacher dashboard access is unavailable.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_dashboard', id: principal.userId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Teacher dashboard access is unavailable.');

    const record = await this.repository.dashboard(principal.userId, assignment.schoolId, now);
    if (!record) throw new AppError(403, 'FORBIDDEN', 'Teacher dashboard access is unavailable.');

    return this.toDashboard(record, now);
  }

  private toDashboard(record: TeacherDashboardRecord, now: Date): TeacherDashboard {
    const sessions = record.classes.flatMap((schoolClass) =>
      schoolClass.sessions.map((session): TeacherSession => {
        const knownStudentIds = new Set(session.records.map(({ studentId }) => studentId));
        return {
          id: session.id,
          classId: schoolClass.id,
          className: schoolClass.name,
          subjectName: session.subjectName,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          state: session.state,
          attendance: {
            expectedStudents: schoolClass.studentIds.length,
            knownRecords: knownStudentIds.size,
            missingRecords: Math.max(0, schoolClass.studentIds.length - knownStudentIds.size),
            absentRecords: session.records.filter(({ state }) => state === 'ABSENT').length,
          },
        };
      }),
    );

    return {
      teacher: {
        id: record.teacher.id,
        displayName: record.teacher.displayName ?? 'Teacher',
      },
      school: record.school,
      summary: {
        assignedClasses: record.classes.length,
        authorizedStudents: new Set(record.classes.flatMap(({ studentIds }) => studentIds)).size,
        openStudentTasks: record.classes.reduce(
          (count, schoolClass) => count + schoolClass.openTaskCount,
          0,
        ),
        attendanceSessionsPending: sessions.filter(
          ({ state, attendance }) => state === 'COMPLETED' && attendance.missingRecords > 0,
        ).length,
      },
      classes: record.classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        studentCount: schoolClass.studentIds.length,
        sessionSubjects: [...new Set(schoolClass.sessions.map(({ subjectName }) => subjectName))],
        openTaskCount: schoolClass.openTaskCount,
      })),
      upcomingSessions: sessions
        .filter(({ state, startsAt }) => state === 'SCHEDULED' && new Date(startsAt) >= now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, 5),
      recentSessions: sessions
        .filter(({ state, endsAt }) => state === 'COMPLETED' && new Date(endsAt) <= now)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
        .slice(0, 5),
    };
  }
}
