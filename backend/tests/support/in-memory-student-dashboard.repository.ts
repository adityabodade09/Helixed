import type { StudentDashboardRepository } from '../../src/modules/student-dashboard/student-dashboard.repository.js';
import type { StudentDashboardData } from '../../src/modules/student-dashboard/student-dashboard.types.js';

export class InMemoryStudentDashboardRepository implements StudentDashboardRepository {
  constructor(
    private readonly userId: string,
    private readonly roleAssignmentId: string,
    private readonly dashboard: StudentDashboardData,
  ) {}

  async findStudentRoleAssignmentId(userId: string, _now: Date): Promise<string | null> {
    return userId === this.userId ? this.roleAssignmentId : null;
  }

  async getDashboard(userId: string, _now: Date): Promise<StudentDashboardData | null> {
    return userId === this.userId ? this.dashboard : null;
  }
}
