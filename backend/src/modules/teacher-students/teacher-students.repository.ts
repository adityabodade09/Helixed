import type {
  TeacherStudentDetailRecord,
  TeacherStudentsRecord,
} from './teacher-students.types.js';

export interface TeacherStudentsRepository {
  findTeacherRoleAssignment(
    userId: string,
    now: Date,
  ): Promise<{ id: string; schoolId: string } | null>;
  listStudents(
    teacherId: string,
    schoolId: string,
    now: Date,
    classId?: string,
  ): Promise<TeacherStudentsRecord | null>;
  findStudentDetail(
    teacherId: string,
    studentId: string,
    schoolId: string,
    now: Date,
  ): Promise<TeacherStudentDetailRecord | null>;
}
