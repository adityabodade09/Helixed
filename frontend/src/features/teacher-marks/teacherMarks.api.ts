import { apiRequest } from '../../services/api/apiClient';

export interface TeacherMarks {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string }[];
  summary: { totalAssessments: number; complete: number; pendingEntry: number };
  assessments: {
    id: string;
    title: string;
    class: { id: string; name: string };
    subjectName: string;
    maximumMarks: number;
    assessedAt: string;
    rosterCount: number;
    recordedCount: number;
    missingCount: number;
  }[];
}

export interface TeacherMarkAssessment {
  id: string;
  title: string;
  class: { id: string; name: string };
  subjectName: string;
  maximumMarks: number;
  assessedAt: string;
  roster: {
    studentId: string;
    displayName: string;
    mark: number | null;
    currentMarkId: string | null;
    recordedAt: string | null;
  }[];
}

const base = '/teacher/marks';

export const teacherMarksApi = {
  list: (token: string, filters: { classId?: string; search?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.classId) params.set('classId', filters.classId);
    if (filters.search) params.set('search', filters.search);
    return apiRequest<TeacherMarks>(`${base}${params.size ? `?${params}` : ''}`, {
      accessToken: token,
    });
  },
  detail: (token: string, assessmentId: string) =>
    apiRequest<TeacherMarkAssessment>(`${base}/${assessmentId}`, { accessToken: token }),
  record: (
    token: string,
    assessmentId: string,
    marks: { studentId: string; value: number; expectedMarkId: string | null }[],
  ) =>
    apiRequest<TeacherMarkAssessment>(`${base}/${assessmentId}`, {
      method: 'PATCH',
      accessToken: token,
      body: { marks },
    }),
};
