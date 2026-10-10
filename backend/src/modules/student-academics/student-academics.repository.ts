import type {
  AcademicDoubt,
  AcademicExam,
  AcademicNote,
  AcademicResource,
  AcademicScheduleItem,
  AcademicSubject,
  AcademicSyllabusItem,
  AcademicTask,
  AcademicsOverview,
} from './student-academics.types.js';

export interface StudentAcademicsRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  getOverview(userId: string, now: Date): Promise<AcademicsOverview | null>;
  getSchedule(userId: string): Promise<AcademicScheduleItem[]>;
  getTasks(userId: string): Promise<AcademicTask[]>;
  getTask(userId: string, taskId: string): Promise<AcademicTask | null>;
  getClassSummary(userId: string): Promise<{
    subjects: AcademicSubject[];
    schedule: AcademicScheduleItem[];
    tasks: AcademicTask[];
  }>;
  getNotes(userId: string): Promise<AcademicNote[]>;
  getExams(userId: string): Promise<AcademicExam[]>;
  getSyllabus(
    userId: string,
  ): Promise<{ subjects: AcademicSubject[]; items: AcademicSyllabusItem[] }>;
  getResources(userId: string): Promise<AcademicResource[]>;
  getDoubts(userId: string): Promise<AcademicDoubt[]>;
  ownsSubject(userId: string, subjectId: string): Promise<boolean>;
  createDoubt(
    userId: string,
    input: { question: string; subjectId?: string },
  ): Promise<AcademicDoubt>;
}
