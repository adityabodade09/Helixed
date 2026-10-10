import type { AcademyDashboardRecord } from './academy-dashboard.types.js';

export interface AcademyDashboardRepository {
  findRoleAssignment(userId: string, now: Date): Promise<{ id: string; academyId: string } | null>;
  dashboard(academyId: string, now: Date): Promise<AcademyDashboardRecord | null>;
}
