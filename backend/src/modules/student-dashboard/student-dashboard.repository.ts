import type { StudentDashboardData } from './student-dashboard.types.js';

export interface StudentDashboardRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  getDashboard(userId: string, now: Date): Promise<StudentDashboardData | null>;
}
