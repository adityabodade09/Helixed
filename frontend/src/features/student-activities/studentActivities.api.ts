import { apiRequest } from '../../services/api/apiClient';
export type Activity = {
  id: string;
  title: string;
  category: string | null;
  status: 'active' | 'inactive';
  startedAt: string | null;
  organization: string | null;
  description: string | null;
};
export type Certificate = {
  id: string;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  state: 'verified' | 'pending' | 'not_verified';
  activity: { id: string; title: string } | null;
};
export type ActivityDetail = Activity & {
  progress: Array<{ id: string; title: string; detail: string | null; occurredAt: string }>;
  milestones: Array<{ id: string; title: string; progress: number; completedAt: string | null }>;
  certificates: Certificate[];
};
const base = '/student/activities';
export const activitiesApi = {
  list: (accessToken: string) => apiRequest<Activity[]>(base, { accessToken }),
  get: (accessToken: string, id: string) =>
    apiRequest<ActivityDetail>(`${base}/${id}`, { accessToken }),
  progress: (accessToken: string, id: string) =>
    apiRequest<ActivityDetail>(`${base}/${id}/progress`, { accessToken }),
  certificates: (accessToken: string) =>
    apiRequest<Certificate[]>(`${base}/certificates`, { accessToken }),
  create: (
    accessToken: string,
    body: {
      title: string;
      category: string;
      startedAt: string;
      organization?: string;
      description?: string;
    },
  ) => apiRequest<Activity>(base, { accessToken, method: 'POST', body }),
};
