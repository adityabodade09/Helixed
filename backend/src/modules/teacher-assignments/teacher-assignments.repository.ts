import type {
  AssignmentStatusValue,
  CreateAssignmentInput,
  TeacherAssignment,
  TeacherAssignmentsRecord,
} from './teacher-assignments.types.js';

export interface AssignmentFilters {
  classId?: string;
  status?: AssignmentStatusValue;
  search?: string;
}

export interface TeacherAssignmentsRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  list(
    teacherId: string,
    schoolId: string,
    now: Date,
    filters: AssignmentFilters,
  ): Promise<TeacherAssignmentsRecord | null>;
  create(
    teacherId: string,
    schoolId: string,
    now: Date,
    input: CreateAssignmentInput,
  ): Promise<TeacherAssignment | null>;
}
