import type { StudentOpportunitiesRepository } from '../../src/modules/student-opportunities/student-opportunities.repository.js';
import type { Opportunity } from '../../src/modules/student-opportunities/student-opportunities.types.js';
export class InMemoryStudentOpportunitiesRepository implements StudentOpportunitiesRepository {
  constructor(
    private readonly userId: string,
    private readonly roleId: string,
    private readonly item: Opportunity,
  ) {}
  async findStudentRoleAssignmentId(userId: string) {
    return userId === this.userId ? this.roleId : null;
  }
  async list(userId: string) {
    return userId === this.userId ? [this.item] : [];
  }
  async get(userId: string, id: string) {
    return userId === this.userId && id === this.item.id ? this.item : null;
  }
  async save(userId: string, id: string) {
    if (userId !== this.userId || id !== this.item.id) return null;
    this.item.saved = true;
    return this.item;
  }
  async unsave(userId: string, id: string) {
    if (userId === this.userId && id === this.item.id) this.item.saved = false;
    return true;
  }
  async apply(userId: string, id: string) {
    if (userId !== this.userId || id !== this.item.id) return null;
    if (this.item.application) return 'duplicate' as const;
    this.item.application = {
      id: 'app',
      state: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };
    return this.item;
  }
}
