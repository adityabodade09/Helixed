import { apiRequest } from '../../services/api/apiClient';

export type AttendanceState = 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL';
export type SessionState = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

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
    state: SessionState;
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
  state: SessionState;
  canRecord: boolean;
  roster: {
    studentId: string;
    displayName: string;
    status: AttendanceState | null;
    currentRecordId: string | null;
    recordedAt: string | null;
  }[];
}

const base = '/teacher/attendance';

export const teacherAttendanceApi = {
  list: (
    token: string,
    filters: { classId?: string; date?: string; state?: SessionState } = {},
  ) => {
    const params = new URLSearchParams();
    if (filters.classId) params.set('classId', filters.classId);
    if (filters.date) params.set('date', filters.date);
    if (filters.state) params.set('state', filters.state);
    return apiRequest<TeacherAttendance>(`${base}${params.size ? `?${params}` : ''}`, {
      accessToken: token,
    });
  },
  detail: (token: string, sessionId: string) =>
    apiRequest<TeacherAttendanceSession>(`${base}/${sessionId}`, { accessToken: token }),
  record: (
    token: string,
    sessionId: string,
    records: {
      studentId: string;
      state: AttendanceState;
      expectedRecordId: string | null;
    }[],
  ) =>
    apiRequest<TeacherAttendanceSession>(`${base}/${sessionId}`, {
      method: 'PATCH',
      accessToken: token,
      body: { records },
    }),
};
