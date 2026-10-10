import type { StudentGrowthRepository } from '../../src/modules/student-growth/student-growth.repository.js';
import type { GrowthData } from '../../src/modules/student-growth/student-growth.types.js';
export class InMemoryStudentGrowthRepository implements StudentGrowthRepository {
  constructor(
    private readonly userId: string,
    private readonly roleId: string,
    private readonly data: GrowthData,
  ) {}
  async findStudentRoleAssignmentId(userId: string) {
    return userId === this.userId ? this.roleId : null;
  }
  async get(userId: string) {
    return userId === this.userId ? this.data : null;
  }
}
