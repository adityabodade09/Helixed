import type {
  ActivityCertificate,
  ActivityDetail,
  ActivitySummary,
} from './student-activities.types.js';
export interface StudentActivitiesRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  list(userId: string): Promise<ActivitySummary[]>;
  get(userId: string, activityId: string): Promise<ActivityDetail | null>;
  certificates(userId: string): Promise<ActivityCertificate[]>;
  create(
    userId: string,
    input: {
      title: string;
      category: string;
      startedAt: Date;
      organization?: string;
      description?: string;
    },
  ): Promise<ActivitySummary>;
}
