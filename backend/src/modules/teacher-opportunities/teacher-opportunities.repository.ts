import type {
  TeacherOpportunityCatalog,
  TeacherOpportunityFilters,
} from './teacher-opportunities.types.js';

export interface TeacherOpportunitiesRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  catalog(
    teacherId: string,
    schoolId: string,
    filters: TeacherOpportunityFilters,
    now: Date,
  ): Promise<TeacherOpportunityCatalog | null>;
}
