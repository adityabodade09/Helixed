import type { TeacherClassSummaryRecord } from './teacher-class-summary.types.js';

export interface TeacherClassSummaryRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  findClassSummary(
    teacherId: string,
    schoolId: string,
    classId: string,
    now: Date,
  ): Promise<TeacherClassSummaryRecord | null>;
}
