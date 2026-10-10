import { apiRequest } from '../../services/api/apiClient';

export interface AcademyDashboard {
  academy: { id: string; name: string };
  summary: {
    enrolledStudents: number;
    batches: number;
    assignedCoaches: number;
  };
  batches: {
    id: string;
    name: string;
    studentCount: number;
    coachCount: number;
  }[];
}

export const academyDashboardApi = {
  get: (token: string) => apiRequest<AcademyDashboard>('/academy', { accessToken: token }),
};
