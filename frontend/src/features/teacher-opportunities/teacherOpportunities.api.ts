import { apiRequest } from '../../services/api/apiClient';

export type TeacherOpportunity = {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  provider: string | null;
  location: string | null;
  deadline: string | null;
  availability: 'OPEN' | 'CLOSED';
};

export type TeacherOpportunities = {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  discovery: { mode: 'GENERAL'; explanation: string };
  filters: { categories: string[] };
  opportunities: TeacherOpportunity[];
};

export type TeacherOpportunityQuery = {
  search?: string;
  category?: string;
  availability?: 'OPEN' | 'CLOSED';
};

export const teacherOpportunitiesApi = {
  get(token: string, query: TeacherOpportunityQuery = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    return apiRequest<TeacherOpportunities>(
      `/teacher/opportunities${params.size ? `?${params}` : ''}`,
      { accessToken: token },
    );
  },
};
