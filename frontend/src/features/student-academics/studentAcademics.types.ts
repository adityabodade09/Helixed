export interface Subject {
  id: string;
  name: string;
  progress: number;
  nextClassAt: string | null;
}
export interface ScheduleItem {
  id: string;
  title: string;
  detail: string | null;
  startsAt: string;
  endsAt: string;
  color: string;
}
export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
  completedAt: string | null;
  subject: { id: string; name: string } | null;
}
export interface Exam {
  id: string;
  title: string;
  detail: string | null;
  startsAt: string;
  subject: { id: string; name: string } | null;
}
export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  subject: { id: string; name: string } | null;
}
export interface Resource {
  id: string;
  title: string;
  resourceType: string;
  description: string | null;
  url: string | null;
  createdAt: string;
  subject: { id: string; name: string } | null;
}
export interface SyllabusItem {
  id: string;
  title: string;
  progress: number;
  displayOrder: number;
  subject: { id: string; name: string };
}
export interface Doubt {
  id: string;
  question: string;
  state: 'open' | 'solved';
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string } | null;
}
export interface AcademicsOverview {
  student: { displayName: string };
  subjects: Subject[];
  schedule: ScheduleItem[];
  tasks: Task[];
  exams: Exam[];
}
