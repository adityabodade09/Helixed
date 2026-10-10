export type GrowthDimension = { name: string; value: number; evidence: string };
export type GrowthAchievement = {
  id: string;
  title: string;
  category: string;
  date: string | null;
};
export type GrowthData = {
  studentName: string;
  dimensions: GrowthDimension[];
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
  achievements: GrowthAchievement[];
};
