import type {
  AttendanceWrite,
  AttendanceWriteResult,
  TeacherAttendanceRecord,
  TeacherAttendanceSessionRecord,
} from './teacher-attendance.types.js';

export interface AttendanceFilters {
  classId?: string;
  date?: string;
  state?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface TeacherAttendanceRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  list(
    teacherId: string,
    schoolId: string,
    now: Date,
    filters: AttendanceFilters,
  ): Promise<TeacherAttendanceRecord | null>;
  findSession(
    teacherId: string,
    schoolId: string,
    sessionId: string,
    now: Date,
  ): Promise<TeacherAttendanceSessionRecord | null>;
  record(
    teacherId: string,
    schoolId: string,
    sessionId: string,
    writes: AttendanceWrite[],
    now: Date,
  ): Promise<AttendanceWriteResult>;
}
