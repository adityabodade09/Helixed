import { apiRequest } from '../../services/api/apiClient';

export type AssignmentStatus =
  'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'ARCHIVED' | 'CANCELLED';

export interface TeacherAssignments {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string; subjects: string[] }[];
  summary: { total: number; active: number; dueThisWeek: number };
  assignments: {
    id: string;
    title: string;
    class: { id: string; name: string };
    subjectName: string;
    dueAt: string | null;
    status: AssignmentStatus;
    createdAt: string;
  }[];
}

export interface CreateAssignmentInput {
  classId: string;
  title: string;
  description?: string;
  subjectName: string;
  dueAt?: string;
  status: 'DRAFT' | 'PUBLISHED';
}

export const teacherAssignmentsApi = {
  get: (
    token: string,
    filters: { search?: string; classId?: string; status?: AssignmentStatus },
  ) => {
    const query = new URLSearchParams();
    if (filters.search) query.set('search', filters.search);
    if (filters.classId) query.set('classId', filters.classId);
    if (filters.status) query.set('status', filters.status);
    return apiRequest<TeacherAssignments>(
      `/teacher/assignments${query.size ? `?${query.toString()}` : ''}`,
      { accessToken: token },
    );
  },
  create: (token: string, input: CreateAssignmentInput) =>
    apiRequest<TeacherAssignments['assignments'][number]>('/teacher/assignments', {
      method: 'POST',
      accessToken: token,
      body: input,
    }),
};
