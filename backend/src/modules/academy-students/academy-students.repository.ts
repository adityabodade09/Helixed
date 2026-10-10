import type {
  AcademyStudentDetailRecord,
  AcademyStudentFilters,
  AcademyStudentsRecord,
} from './academy-students.types.js';

export interface AcademyStudentsRepository {
  list(
    academyId: string,
    filters: AcademyStudentFilters,
    now: Date,
  ): Promise<AcademyStudentsRecord | null>;
  detail(
    academyId: string,
    studentId: string,
    now: Date,
  ): Promise<AcademyStudentDetailRecord | null>;
}
