import type {
  TeacherDevelopmentEvidenceRecord,
  TeacherDevelopmentScopeRecord,
} from './teacher-development.types.js';

export interface TeacherDevelopmentRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  findScope(
    teacherId: string,
    schoolId: string,
    now: Date,
  ): Promise<TeacherDevelopmentScopeRecord | null>;
  findEvidence(
    teacherId: string,
    schoolId: string,
    classId: string,
    studentId: string,
    now: Date,
  ): Promise<TeacherDevelopmentEvidenceRecord | null>;
}
