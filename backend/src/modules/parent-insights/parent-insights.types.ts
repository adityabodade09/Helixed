import type { AttendanceValue } from '../parent-attendance/attendance-summary.js';

export type ParentInsightEvidence = {
  child: { id: string; displayName: string };
  subjects: { id: string; name: string; progress: number }[];
  tasks: { id: string; title: string; dueAt: Date | null; completedAt: Date | null }[];
  attendance: AttendanceValue[];
  activities: {
    id: string;
    title: string;
    active: boolean;
    milestones: number;
    completedMilestones: number;
  }[];
  certificates: number;
  upcoming: {
    tasks: { id: string; title: string; at: Date }[];
    exams: { id: string; title: string; at: Date }[];
    schedule: { id: string; title: string; at: Date }[];
  };
};

export type ParentInsightFact = {
  id: string;
  category: 'ATTENDANCE' | 'TASKS' | 'ACTIVITIES' | 'UPCOMING';
  statement: string;
  evidence: string;
};
