import { apiRequest } from '../../services/api/apiClient';

export interface TeacherClasses {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    subjects: string[];
    studentCount: number;
    openTaskCount: number;
    attendanceRecordingPending: number;
    nextSession: { subjectName: string; startsAt: string; endsAt: string } | null;
  }[];
}

export type TeacherClassDetail = TeacherClasses['classes'][number] & {
  school: { id: string; name: string };
  recentSessions: {
    id: string;
    subjectName: string;
    startsAt: string;
    endsAt: string;
    state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    knownAttendanceCount: number;
    missingAttendanceCount: number;
    absentAttendanceCount: number;
  }[];
};

export const teacherClassesApi = {
  get: (token: string, search?: string) =>
    apiRequest<TeacherClasses>(
      `/teacher/classes${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      {
        accessToken: token,
      },
    ),
  getDetail: (token: string, classId: string) =>
    apiRequest<TeacherClassDetail>(`/teacher/classes/${encodeURIComponent(classId)}`, {
      accessToken: token,
    }),
};
