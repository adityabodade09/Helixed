import type {
  MarkWrite,
  MarkWriteResult,
  TeacherMarkAssessmentRecord,
  TeacherMarksRecord,
} from './teacher-marks.types.js';

export interface MarksFilters {
  classId?: string;
  search?: string;
}

export interface TeacherMarksRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  list(
    teacherId: string,
    schoolId: string,
    now: Date,
    filters: MarksFilters,
  ): Promise<TeacherMarksRecord | null>;
  findAssessment(
    teacherId: string,
    schoolId: string,
    assessmentId: string,
    now: Date,
  ): Promise<TeacherMarkAssessmentRecord | null>;
  record(
    teacherId: string,
    schoolId: string,
    assessmentId: string,
    writes: MarkWrite[],
    now: Date,
  ): Promise<MarkWriteResult>;
}
