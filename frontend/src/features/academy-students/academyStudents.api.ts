import { apiRequest } from '../../services/api/apiClient';

export interface AcademyStudentsResponse {
  academy: { id: string; name: string };
  batches: { id: string; name: string }[];
  students: {
    id: string;
    displayName: string;
    enrolledAt: string;
    batches: { id: string; name: string }[];
  }[];
}

export interface AcademyStudentDetailResponse {
  academy: { id: string; name: string };
  student: AcademyStudentsResponse['students'][number];
}

export interface AcademyStudentFilters {
  search?: string;
  batchId?: string;
}

export const academyStudentsApi = {
  list: (token: string, filters: AcademyStudentFilters) => {
    const query = new URLSearchParams();
    if (filters.search) query.set('search', filters.search);
    if (filters.batchId) query.set('batchId', filters.batchId);
    const suffix = query.size ? `?${query}` : '';
    return apiRequest<AcademyStudentsResponse>(`/academy/students${suffix}`, {
      accessToken: token,
    });
  },
  detail: (token: string, studentId: string) =>
    apiRequest<AcademyStudentDetailResponse>(`/academy/students/${studentId}`, {
      accessToken: token,
    }),
};
