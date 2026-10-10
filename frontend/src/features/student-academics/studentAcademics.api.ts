import { apiRequest } from '../../services/api/apiClient';
import type {
  AcademicsOverview,
  Doubt,
  Exam,
  Note,
  Resource,
  ScheduleItem,
  Subject,
  SyllabusItem,
  Task,
} from './studentAcademics.types';

const base = '/student/academics';
export const studentAcademicsApi = {
  overview: (accessToken: string) => apiRequest<AcademicsOverview>(base, { accessToken }),
  schedule: (accessToken: string) =>
    apiRequest<ScheduleItem[]>(`${base}/schedule`, { accessToken }),
  tasks: (accessToken: string) => apiRequest<Task[]>(`${base}/tasks`, { accessToken }),
  task: (accessToken: string, id: string) =>
    apiRequest<Task>(`${base}/tasks/${id}`, { accessToken }),
  classSummary: (accessToken: string) =>
    apiRequest<{ subjects: Subject[]; schedule: ScheduleItem[]; tasks: Task[] }>(
      `${base}/class-summary`,
      { accessToken },
    ),
  notes: (accessToken: string) => apiRequest<Note[]>(`${base}/notes`, { accessToken }),
  exams: (accessToken: string) => apiRequest<Exam[]>(`${base}/exams`, { accessToken }),
  syllabus: (accessToken: string) =>
    apiRequest<{ subjects: Subject[]; items: SyllabusItem[] }>(`${base}/syllabus`, { accessToken }),
  resources: (accessToken: string) => apiRequest<Resource[]>(`${base}/resources`, { accessToken }),
  doubts: (accessToken: string) => apiRequest<Doubt[]>(`${base}/doubts`, { accessToken }),
  createDoubt: (accessToken: string, body: { question: string; subjectId?: string }) =>
    apiRequest<Doubt>(`${base}/doubts`, { accessToken, method: 'POST', body }),
};
