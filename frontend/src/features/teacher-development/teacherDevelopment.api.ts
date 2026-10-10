import { apiRequest } from '../../services/api/apiClient';
import type { AssignmentStatus } from '../teacher-assignments/teacherAssignments.api';

export interface TeacherDevelopment {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    students: { id: string; displayName: string }[];
  }[];
  selection: {
    class: { id: string; name: string };
    student: { id: string; displayName: string };
  } | null;
  attendance: {
    known: number;
    missing: number;
    present: number;
    absent: number;
    late: number;
    partial: number;
    presentRate: number | null;
    sessions: {
      id: string;
      subjectName: string;
      startsAt: string;
      state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;
    }[];
  };
  assessments: {
    recorded: number;
    missing: number;
    normalizedAverage: number | null;
    items: {
      id: string;
      title: string;
      subjectName: string;
      maximumMarks: number;
      assessedAt: string;
      mark: number | null;
      normalizedPercent: number | null;
    }[];
  };
  classAssignments: {
    attribution: 'CLASS_CONTEXT_ONLY';
    items: {
      id: string;
      title: string;
      subjectName: string;
      dueAt: string | null;
      status: AssignmentStatus;
    }[];
  };
  activityEvidence: { available: false };
}

export const teacherDevelopmentApi = {
  get: (token: string, filters: { classId?: string; studentId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.classId) params.set('classId', filters.classId);
    if (filters.studentId) params.set('studentId', filters.studentId);
    return apiRequest<TeacherDevelopment>(
      `/teacher/development${params.size ? `?${params}` : ''}`,
      { accessToken: token },
    );
  },
};
