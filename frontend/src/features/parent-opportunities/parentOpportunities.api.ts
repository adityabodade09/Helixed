import { apiRequest } from '../../services/api/apiClient';

export type ParentOpportunity = {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  provider: string | null;
  location: string | null;
  deadline: string | null;
  availability: 'OPEN' | 'CLOSED';
  approvalPending: boolean;
};

export type ParentOpportunities = {
  children: { id: string; displayName: string | null }[];
  child: { id: string; displayName: string };
  discovery: { mode: 'GENERAL'; explanation: string };
  filters: { categories: string[] };
  opportunities: ParentOpportunity[];
};

export type ParentOpportunityQuery = {
  childId?: string;
  search?: string;
  category?: string;
  availability?: 'OPEN' | 'CLOSED';
};

export const parentOpportunitiesApi = {
  get: (token: string, query: ParentOpportunityQuery = {}) => {
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) parameters.set(key, value);
    const suffix = parameters.size ? `?${parameters}` : '';
    return apiRequest<ParentOpportunities>(`/parent/opportunities${suffix}`, {
      accessToken: token,
    });
  },
};
