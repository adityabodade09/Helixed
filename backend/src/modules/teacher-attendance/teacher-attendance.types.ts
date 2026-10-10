export type AttendanceValue = 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL';
export type AttendanceSessionValue = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface TeacherAttendanceRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    studentIds: string[];
    sessions: {
      id: string;
      subjectName: string;
      startsAt: Date;
      endsAt: Date;
      state: AttendanceSessionValue;
      records: { studentId: string; state: AttendanceValue }[];
    }[];
  }[];
}

export interface TeacherAttendanceSessionRecord {
  id: string;
  subjectName: string;
  startsAt: Date;
  endsAt: Date;
  state: AttendanceSessionValue;
  schoolClass: { id: string; name: string };
  students: {
    id: string;
    displayName: string | null;
    record: { id: string; state: AttendanceValue; recordedAt: Date } | null;
  }[];
}

export interface TeacherAttendance {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string }[];
  sessions: {
    id: string;
    classId: string;
    className: string;
    subjectName: string;
    startsAt: string;
    endsAt: string;
    state: AttendanceSessionValue;
    rosterCount: number;
    recordedCount: number;
    missingCount: number;
    absentCount: number;
    recordingStatus: 'NOT_STARTED' | 'PARTIAL' | 'COMPLETE';
  }[];
}

export interface TeacherAttendanceSession {
  id: string;
  class: { id: string; name: string };
  subjectName: string;
  startsAt: string;
  endsAt: string;
  state: AttendanceSessionValue;
  canRecord: boolean;
  roster: {
    studentId: string;
    displayName: string;
    status: AttendanceValue | null;
    currentRecordId: string | null;
    recordedAt: string | null;
  }[];
}

export interface AttendanceWrite {
  studentId: string;
  state: AttendanceValue;
  expectedRecordId: string | null;
}

export type AttendanceWriteResult = 'SUCCESS' | 'NOT_AVAILABLE' | 'CONFLICT';
