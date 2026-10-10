import type { GrowthData } from './student-growth.types.js';
export interface StudentGrowthRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  get(userId: string): Promise<GrowthData | null>;
}
