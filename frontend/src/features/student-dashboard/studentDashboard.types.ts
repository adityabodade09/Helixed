export interface StudentDashboard {
  student: { displayName: string };
  today: string;
  summary: {
    classesToday: number;
    tasksDue: number;
    upcomingExam: { title: string; startsAt: string } | null;
    overallProgress: number | null;
  };
  schedule: Array<{
    id: string;
    title: string;
    detail: string | null;
    startsAt: string;
    color: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    priority: 'high' | 'medium' | 'low';
  }>;
  subjects: Array<{ id: string; name: string; progress: number; nextClassAt: string | null }>;
  activities: Array<{ id: string; title: string; detail: string | null; occursAt: string | null }>;
  announcements: Array<{ id: string; title: string; createdAt: string }>;
  opportunities: Array<{
    id: string;
    title: string;
    detail: string | null;
    deadline: string | null;
  }>;
}
