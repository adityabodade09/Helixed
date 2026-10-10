import { apiRequest } from '../../services/api/apiClient';

export interface AcademyBatchesResponse {
  academy: { id: string; name: string };
  summary: {
    batches: number;
    enrolledStudents: number;
    assignedCoaches: number;
  };
  batches: {
    id: string;
    name: string;
    studentCount: number;
    coachCount: number;
  }[];
}

export interface AcademyBatchDetailResponse {
  academy: { id: string; name: string };
  batch: { id: string; name: string };
  summary: { students: number; coaches: number };
  students: { id: string; displayName: string }[];
  coaches: { id: string; displayName: string }[];
}

export const academyBatchesApi = {
  list: (token: string, search?: string) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    return apiRequest<AcademyBatchesResponse>(`/academy/batches${query.size ? `?${query}` : ''}`, {
      accessToken: token,
    });
  },
  detail: (token: string, batchId: string) =>
    apiRequest<AcademyBatchDetailResponse>(`/academy/batches/${batchId}`, {
      accessToken: token,
    }),
};
