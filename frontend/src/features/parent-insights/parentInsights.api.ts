import { apiRequest } from '../../services/api/apiClient';

export type ParentInsights = {
  children: { id: string; displayName: string | null }[];
  child: { id: string; displayName: string };
  period: { label: string; startsAt: string; endsAt: string; upcomingEndsAt: string };
  subjects: { id: string; name: string; progress: number }[];
  attendance: {
    scheduledSessions: number;
    knownSessions: number;
    missingSessions: number;
    present: number;
    absent: number;
    late: number;
    partial: number;
    presentRate: number | null;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    upcoming: number;
    open: number;
    completedWithDeadline: number;
    completedOnTime: number;
    dueThisWeek: number;
  };
  activities: {
    active: number;
    milestones: number;
    completedMilestones: number;
    certificates: number;
    items: {
      id: string;
      title: string;
      active: boolean;
      milestones: number;
      completedMilestones: number;
    }[];
  };
  upcoming: {
    tasks: { id: string; title: string; at: string }[];
    exams: { id: string; title: string; at: string }[];
    schedule: { id: string; title: string; at: string }[];
  };
  facts: {
    id: string;
    category: 'ATTENDANCE' | 'TASKS' | 'ACTIVITIES' | 'UPCOMING';
    statement: string;
    evidence: string;
  }[];
  hasEvidence: boolean;
};

export const parentInsightsApi = {
  get: (token: string, childId?: string) =>
    apiRequest<ParentInsights>(`/parent/insights${childId ? `?childId=${childId}` : ''}`, {
      accessToken: token,
    }),
};
