import type { StudentAcademicsRepository } from '../../src/modules/student-academics/student-academics.repository.js';
import type {
  AcademicDoubt,
  AcademicTask,
  AcademicsOverview,
} from '../../src/modules/student-academics/student-academics.types.js';

export class InMemoryStudentAcademicsRepository implements StudentAcademicsRepository {
  doubts: AcademicDoubt[] = [];
  constructor(
    private readonly userId: string,
    private readonly roleAssignmentId: string,
    private readonly overview: AcademicsOverview,
    private readonly tasks: AcademicTask[],
  ) {}
  async findStudentRoleAssignmentId(userId: string) {
    return userId === this.userId ? this.roleAssignmentId : null;
  }
  async getOverview(userId: string) {
    return userId === this.userId ? this.overview : null;
  }
  async getSchedule() {
    return this.overview.schedule;
  }
  async getTasks() {
    return this.tasks;
  }
  async getTask(userId: string, taskId: string) {
    return userId === this.userId ? (this.tasks.find((task) => task.id === taskId) ?? null) : null;
  }
  async getClassSummary() {
    return {
      subjects: this.overview.subjects,
      schedule: this.overview.schedule,
      tasks: this.tasks,
    };
  }
  async getNotes() {
    return [];
  }
  async getExams() {
    return this.overview.exams;
  }
  async getSyllabus() {
    return { subjects: this.overview.subjects, items: [] };
  }
  async getResources() {
    return [];
  }
  async getDoubts() {
    return this.doubts;
  }
  async ownsSubject(userId: string, subjectId: string) {
    return (
      userId === this.userId && this.overview.subjects.some((subject) => subject.id === subjectId)
    );
  }
  async createDoubt(_userId: string, input: { question: string; subjectId?: string }) {
    const doubt: AcademicDoubt = {
      id: `doubt-${this.doubts.length + 1}`,
      question: input.question,
      state: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subject: this.overview.subjects.find((subject) => subject.id === input.subjectId) ?? null,
    };
    this.doubts.unshift(doubt);
    return doubt;
  }
}
