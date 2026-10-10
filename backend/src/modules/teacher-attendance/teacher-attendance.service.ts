import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type {
  AttendanceFilters,
  TeacherAttendanceRepository,
} from './teacher-attendance.repository.js';
import type {
  AttendanceWrite,
  TeacherAttendance,
  TeacherAttendanceSession,
  TeacherAttendanceSessionRecord,
} from './teacher-attendance.types.js';

export class TeacherAttendanceService {
  constructor(
    private readonly repository: TeacherAttendanceRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    filters: AttendanceFilters,
  ): Promise<TeacherAttendance> {
    const now = new Date();
    const assignment = await this.roleAssignment(principal, now);
    await this.authorize(principal, assignment.id, 'read', principal.userId, filters.classId);
    const record = await this.repository.list(principal.userId, assignment.schoolId, now, filters);
    if (!record) throw this.unavailable();

    return {
      teacher: { id: record.teacher.id, displayName: record.teacher.displayName ?? 'Teacher' },
      school: record.school,
      classes: record.classes.map(({ id, name }) => ({ id, name })),
      sessions: record.classes
        .flatMap((schoolClass) => {
          const activeStudents = new Set(schoolClass.studentIds);
          return schoolClass.sessions.map((session) => {
            const records = session.records.filter(({ studentId }) =>
              activeStudents.has(studentId),
            );
            const missingCount = Math.max(0, activeStudents.size - records.length);
            return {
              id: session.id,
              classId: schoolClass.id,
              className: schoolClass.name,
              subjectName: session.subjectName,
              startsAt: session.startsAt.toISOString(),
              endsAt: session.endsAt.toISOString(),
              state: session.state,
              rosterCount: activeStudents.size,
              recordedCount: records.length,
              missingCount,
              absentCount: records.filter(({ state }) => state === 'ABSENT').length,
              recordingStatus: (records.length === 0
                ? 'NOT_STARTED'
                : missingCount > 0
                  ? 'PARTIAL'
                  : 'COMPLETE') as 'NOT_STARTED' | 'PARTIAL' | 'COMPLETE',
            };
          });
        })
        .sort((left, right) => right.startsAt.localeCompare(left.startsAt)),
    };
  }

  async detail(
    principal: AuthenticatedPrincipal,
    sessionId: string,
  ): Promise<TeacherAttendanceSession> {
    const now = new Date();
    const assignment = await this.roleAssignment(principal, now);
    const session = await this.repository.findSession(
      principal.userId,
      assignment.schoolId,
      sessionId,
      now,
    );
    if (!session) throw this.unavailable();
    await this.authorize(
      principal,
      assignment.id,
      'read',
      sessionId,
      session.schoolClass.id,
      sessionId,
    );
    return this.sessionDto(session);
  }

  async record(
    principal: AuthenticatedPrincipal,
    sessionId: string,
    writes: AttendanceWrite[],
  ): Promise<TeacherAttendanceSession> {
    const now = new Date();
    const assignment = await this.roleAssignment(principal, now);
    const session = await this.repository.findSession(
      principal.userId,
      assignment.schoolId,
      sessionId,
      now,
    );
    if (!session) throw this.unavailable();
    await this.authorize(
      principal,
      assignment.id,
      'update',
      sessionId,
      session.schoolClass.id,
      sessionId,
    );
    if (session.state !== 'COMPLETED')
      throw new AppError(409, 'ATTENDANCE_UNAVAILABLE', 'Attendance recording is unavailable.');

    const result = await this.repository.record(
      principal.userId,
      assignment.schoolId,
      sessionId,
      writes,
      now,
    );
    if (result === 'CONFLICT')
      throw new AppError(
        409,
        'ATTENDANCE_CONFLICT',
        'Attendance changed since it was loaded. Refresh and try again.',
      );
    if (result === 'NOT_AVAILABLE') throw this.unavailable();

    const authoritative = await this.repository.findSession(
      principal.userId,
      assignment.schoolId,
      sessionId,
      new Date(),
    );
    if (!authoritative) throw this.unavailable();
    return this.sessionDto(authoritative);
  }

  private async roleAssignment(principal: AuthenticatedPrincipal, now: Date) {
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();
    return assignment;
  }

  private async authorize(
    principal: AuthenticatedPrincipal,
    roleAssignmentId: string,
    action: 'read' | 'update',
    resourceId: string,
    classId?: string,
    sessionId?: string,
  ) {
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'teacher_attendance', id: resourceId },
      context: {
        roleAssignmentId,
        ...(classId ? { classId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
    });
    if (!decision.allowed) throw this.unavailable();
  }

  private sessionDto(session: TeacherAttendanceSessionRecord): TeacherAttendanceSession {
    return {
      id: session.id,
      class: session.schoolClass,
      subjectName: session.subjectName,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      state: session.state,
      canRecord: session.state === 'COMPLETED',
      roster: session.students.map((student) => ({
        studentId: student.id,
        displayName: student.displayName ?? 'Student',
        status: student.record?.state ?? null,
        currentRecordId: student.record?.id ?? null,
        recordedAt: student.record?.recordedAt.toISOString() ?? null,
      })),
    };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Teacher attendance is unavailable.');
  }
}
