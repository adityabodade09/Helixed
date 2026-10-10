import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { AcademyBatchesRepository } from './academy-batches.repository.js';
import type {
  AcademyBatchDetailResponse,
  AcademyBatchFilters,
  AcademyBatchesResponse,
} from './academy-batches.types.js';

export class AcademyBatchesService {
  constructor(
    private readonly repository: AcademyBatchesRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    filters: AcademyBatchFilters,
  ): Promise<AcademyBatchesResponse> {
    const now = new Date();
    const assignment = await this.repository.findRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_batches', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.unavailable();

    const record = await this.repository.dashboard(assignment.academyId, now);
    if (!record) throw this.unavailable();

    const search = filters.search?.toLocaleLowerCase();
    return {
      academy: record.academy,
      summary: {
        batches: record.batches.length,
        enrolledStudents: new Set(record.enrolledStudentIds).size,
        assignedCoaches: new Set(record.batches.flatMap(({ coachIds }) => coachIds)).size,
      },
      batches: record.batches
        .filter(({ name }) => !search || name.toLocaleLowerCase().includes(search))
        .map((batch) => ({
          id: batch.id,
          name: batch.name,
          studentCount: new Set(batch.studentIds).size,
          coachCount: new Set(batch.coachIds).size,
        })),
    };
  }

  async detail(
    principal: AuthenticatedPrincipal,
    batchId: string,
  ): Promise<AcademyBatchDetailResponse> {
    const now = new Date();
    const assignment = await this.repository.findRoleAssignment(principal.userId, now);
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_batches', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id, batchId },
    });
    if (!decision.allowed) throw this.unavailable();

    const record = await this.repository.batchDetail(assignment.academyId, batchId, now);
    if (!record) throw this.unavailable();

    const students = this.people(record.students, 'Student');
    const coaches = this.people(record.coaches, 'Coach');
    return {
      academy: record.academy,
      batch: record.batch,
      summary: { students: students.length, coaches: coaches.length },
      students,
      coaches,
    };
  }

  private people(people: { id: string; displayName: string | null }[], fallback: string) {
    return [...new Map(people.map((person) => [person.id, person])).values()]
      .map((person) => ({ ...person, displayName: person.displayName ?? fallback }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Academy batches are unavailable.');
  }
}
