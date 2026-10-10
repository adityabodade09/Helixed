import { apiRequest } from '../../services/api/apiClient';
export type GrowthData = {
  studentName: string;
  dimensions: Array<{ name: string; value: number; evidence: string }>;
  academics: {
    subjects: Array<{ id: string; name: string; progress: number }>;
    taskCompletion: number;
  };
  activities: Array<{
    id: string;
    title: string;
    category: string | null;
    milestones: number;
    completedMilestones: number;
  }>;
  patterns: {
    tasksCreated: number;
    tasksCompleted: number;
    groupMemberships: number;
    activeActivities: number;
  };
  achievements: Array<{ id: string; title: string; category: string; date: string | null }>;
};
const base = '/student/growth';
export const growthApi = {
  get: (token: string, page: string) =>
    apiRequest<GrowthData>(page === 'overview' ? base : `${base}/${page}`, { accessToken: token }),
};
