import { apiRequest } from '../../services/api/apiClient';

export interface AcademyCoachesResponse {
  academy: { id: string; name: string };
  summary: { coaches: number };
  coaches: {
    id: string;
    displayName: string;
    joinedAt: string;
    batchCount: number;
    batches: { id: string; name: string }[];
  }[];
}

export const academyCoachesApi = {
  list: (token: string, search?: string) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    return apiRequest<AcademyCoachesResponse>(`/academy/coaches${query.size ? `?${query}` : ''}`, {
      accessToken: token,
    });
  },
};
