import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { StudentAcademicsRepository } from './student-academics.repository.js';

export class StudentAcademicsService {
  constructor(
    private readonly repository: StudentAcademicsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  private async authorize(principal: AuthenticatedPrincipal, action: 'read' | 'create') {
    const roleAssignmentId = await this.repository.findStudentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'student_academics', id: principal.userId },
      context: roleAssignmentId ? { roleAssignmentId } : undefined,
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'You are not authorized to access academic records.');
  }

  async getOverview(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    const overview = await this.repository.getOverview(principal.userId, new Date());
    if (!overview)
      throw new AppError(404, 'ACADEMICS_NOT_FOUND', 'Academic records were not found.');
    return overview;
  }

  async getSchedule(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getSchedule(principal.userId);
  }

  async getTasks(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getTasks(principal.userId);
  }

  async getTask(principal: AuthenticatedPrincipal, taskId: string) {
    await this.authorize(principal, 'read');
    const task = await this.repository.getTask(principal.userId, taskId);
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task was not found.');
    return task;
  }

  async getClassSummary(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getClassSummary(principal.userId);
  }

  async getNotes(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getNotes(principal.userId);
  }

  async getExams(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getExams(principal.userId);
  }

  async getSyllabus(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getSyllabus(principal.userId);
  }

  async getResources(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getResources(principal.userId);
  }

  async getDoubts(principal: AuthenticatedPrincipal) {
    await this.authorize(principal, 'read');
    return this.repository.getDoubts(principal.userId);
  }

  async createDoubt(
    principal: AuthenticatedPrincipal,
    input: { question: string; subjectId?: string },
  ) {
    await this.authorize(principal, 'create');
    if (
      input.subjectId &&
      !(await this.repository.ownsSubject(principal.userId, input.subjectId))
    ) {
      throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject was not found.');
    }
    return this.repository.createDoubt(principal.userId, input);
  }
}
