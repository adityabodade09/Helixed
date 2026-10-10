import { apiRequest } from '../../services/api/apiClient';

export interface TeacherStudents {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string }[];
  students: {
    id: string;
    displayName: string;
    classes: { id: string; name: string; subjects: string[] }[];
  }[];
}

export interface TeacherStudentDetail {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  student: { id: string; displayName: string };
  classes: { id: string; name: string; subjects: string[] }[];
  attendance: {
    summary: {
      scheduledSessions: number;
      knownSessions: number;
      missingSessions: number;
      present: number;
      absent: number;
      late: number;
      partial: number;
      presentRate: number | null;
    };
    sessions: {
      id: string;
      classId: string;
      className: string;
      subjectName: string;
      startsAt: string;
      endsAt: string;
      state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;
    }[];
  };
  tasks: { attributionAvailable: false; items: [] };
}

export const teacherStudentsApi = {
  get: (token: string, options: { search?: string; classId?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.search) params.set('search', options.search);
    if (options.classId) params.set('classId', options.classId);
    const query = params.size ? `?${params}` : '';
    return apiRequest<TeacherStudents>(`/teacher/students${query}`, { accessToken: token });
  },
  getDetail: (token: string, studentId: string) =>
    apiRequest<TeacherStudentDetail>(`/teacher/students/${studentId}`, { accessToken: token }),
};
