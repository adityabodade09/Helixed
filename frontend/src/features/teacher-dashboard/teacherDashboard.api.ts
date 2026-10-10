import { apiRequest } from '../../services/api/apiClient';

export interface TeacherSession {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
  state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  attendance: {
    expectedStudents: number;
    knownRecords: number;
    missingRecords: number;
    absentRecords: number;
  };
}

export interface TeacherDashboard {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  summary: {
    assignedClasses: number;
    authorizedStudents: number;
    openStudentTasks: number;
    attendanceSessionsPending: number;
  };
  classes: {
    id: string;
    name: string;
    studentCount: number;
    sessionSubjects: string[];
    openTaskCount: number;
  }[];
  upcomingSessions: TeacherSession[];
  recentSessions: TeacherSession[];
}

export const teacherDashboardApi = {
  get: (token: string) => apiRequest<TeacherDashboard>('/teacher', { accessToken: token }),
};
