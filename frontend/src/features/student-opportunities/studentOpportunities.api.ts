import { apiRequest } from '../../services/api/apiClient';
export type Opportunity = {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  source: string | null;
  location: string | null;
  deadline: string | null;
  isOpen: boolean;
  saved: boolean;
  application: { id: string; state: string; submittedAt: string | null } | null;
};
const base = '/student/opportunities';
export const opportunitiesApi = {
  list: (token: string, page = '', q = '') =>
    apiRequest<Opportunity[]>(`${base}${page}${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
      accessToken: token,
    }),
  get: (token: string, id: string) =>
    apiRequest<Opportunity>(`${base}/${id}`, { accessToken: token }),
  save: (token: string, id: string) =>
    apiRequest<Opportunity>(`${base}/${id}/save`, { accessToken: token, method: 'POST' }),
  unsave: (token: string, id: string) =>
    apiRequest<void>(`${base}/${id}/save`, { accessToken: token, method: 'DELETE' }),
  apply: (token: string, id: string, note?: string) =>
    apiRequest<Opportunity>(`${base}/${id}/apply`, {
      accessToken: token,
      method: 'POST',
      body: { note },
    }),
};
