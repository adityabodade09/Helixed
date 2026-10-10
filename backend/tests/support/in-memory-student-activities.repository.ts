import type { StudentActivitiesRepository } from '../../src/modules/student-activities/student-activities.repository.js';
import type {
  ActivityCertificate,
  ActivityDetail,
  ActivitySummary,
} from '../../src/modules/student-activities/student-activities.types.js';
export class InMemoryStudentActivitiesRepository implements StudentActivitiesRepository {
  constructor(
    private readonly userId: string,
    private readonly roleId: string,
    private readonly activities: ActivitySummary[],
  ) {}
  async findStudentRoleAssignmentId(userId: string) {
    return userId === this.userId ? this.roleId : null;
  }
  async list(userId: string) {
    return userId === this.userId ? this.activities : [];
  }
  async get(userId: string, id: string): Promise<ActivityDetail | null> {
    const activity = userId === this.userId ? this.activities.find((item) => item.id === id) : null;
    return activity ? { ...activity, progress: [], milestones: [], certificates: [] } : null;
  }
  async certificates(_userId: string): Promise<ActivityCertificate[]> {
    return [];
  }
  async create(
    userId: string,
    input: {
      title: string;
      category: string;
      startedAt: Date;
      organization?: string;
      description?: string;
    },
  ) {
    const activity: ActivitySummary = {
      id: '00000000-0000-4000-8000-000000000099',
      title: input.title,
      category: input.category,
      status: 'active',
      startedAt: input.startedAt.toISOString(),
      organization: input.organization ?? null,
      description: input.description ?? null,
    };
    if (userId === this.userId) this.activities.push(activity);
    return activity;
  }
}
