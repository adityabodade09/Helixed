export interface AcademicSubject {
  id: string;
  name: string;
  progress: number;
  nextClassAt: string | null;
}

export interface AcademicTask {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
  completedAt: string | null;
  subject: { id: string; name: string } | null;
}

export interface AcademicScheduleItem {
  id: string;
  title: string;
  detail: string | null;
  startsAt: string;
  endsAt: string;
  color: string;
}

export interface AcademicExam {
  id: string;
  title: string;
  detail: string | null;
  startsAt: string;
  subject: { id: string; name: string } | null;
}

export interface AcademicNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  subject: { id: string; name: string } | null;
}

export interface AcademicResource {
  id: string;
  title: string;
  resourceType: string;
  description: string | null;
  url: string | null;
  createdAt: string;
  subject: { id: string; name: string } | null;
}

export interface AcademicSyllabusItem {
  id: string;
  title: string;
  progress: number;
  displayOrder: number;
  subject: { id: string; name: string };
}

export interface AcademicDoubt {
  id: string;
  question: string;
  state: 'open' | 'solved';
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string } | null;
}

export interface AcademicsOverview {
  student: { displayName: string };
  subjects: AcademicSubject[];
  schedule: AcademicScheduleItem[];
  tasks: AcademicTask[];
  exams: AcademicExam[];
}
