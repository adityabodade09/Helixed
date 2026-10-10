import type { TeacherDashboardRecord } from './teacher-dashboard.types.js';

export interface TeacherDashboardRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  dashboard(teacherId: string, schoolId: string, now: Date): Promise<TeacherDashboardRecord | null>;
}
