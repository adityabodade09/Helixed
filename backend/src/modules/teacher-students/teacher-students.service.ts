import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import {
  summarizeAttendance,
  type AttendanceValue,
} from '../parent-attendance/attendance-summary.js';
import type { TeacherStudentsRepository } from './teacher-students.repository.js';
import type { TeacherStudentDetail, TeacherStudents } from './teacher-students.types.js';

export class TeacherStudentsService {
  constructor(
    private readonly repository: TeacherStudentsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    options: { search?: string; classId?: string },
  ): Promise<TeacherStudents> {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw new AppError(403, 'FORBIDDEN', 'Teacher students are unavailable.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_students', id: principal.userId },
      context: {
        roleAssignmentId: assignment.id,
        ...(options.classId ? { classId: options.classId } : {}),
      },
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Teacher students are unavailable.');

    const record = await this.repository.listStudents(
      principal.userId,
      assignment.schoolId,
      now,
      options.classId,
    );
    if (!record) throw new AppError(403, 'FORBIDDEN', 'Teacher students are unavailable.');

    const search = options.search?.toLocaleLowerCase('en-US');
    const students = record.students
      .filter(
        (student) =>
          !search ||
          `${student.displayName ?? ''} ${student.classes.map((schoolClass) => schoolClass.name).join(' ')}`
            .toLocaleLowerCase('en-US')
            .includes(search),
      )
      .sort((left, right) => (left.displayName ?? '').localeCompare(right.displayName ?? ''))
      .map((student) => ({ ...student, displayName: student.displayName ?? 'Student' }));

    return {
      teacher: { id: record.teacher.id, displayName: record.teacher.displayName ?? 'Teacher' },
      school: record.school,
      classes: [
        ...new Map(
          students.flatMap((student) => student.classes).map((item) => [item.id, item]),
        ).values(),
      ].map(({ id, name }) => ({ id, name })),
      students,
    };
  }

  async detail(
    principal: AuthenticatedPrincipal,
    studentId: string,
  ): Promise<TeacherStudentDetail> {
    const now = new Date();
    const assignment = await this.repository.findTeacherRoleAssignment(principal.userId, now);
    if (!assignment) throw new AppError(403, 'FORBIDDEN', 'Student access is unavailable.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'teacher_students', id: studentId },
      context: { roleAssignmentId: assignment.id, studentId },
    });
    if (!decision.allowed) throw new AppError(403, 'FORBIDDEN', 'Student access is unavailable.');

    const record = await this.repository.findStudentDetail(
      principal.userId,
      studentId,
      assignment.schoolId,
      now,
    );
    if (!record) throw new AppError(403, 'FORBIDDEN', 'Student access is unavailable.');

    const sessions = record.student.classes
      .flatMap((schoolClass) =>
        schoolClass.sessions.map((session) => ({
          id: session.id,
          classId: schoolClass.id,
          className: schoolClass.name,
          subjectName: session.subjectName,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          state: (session.records[0]?.state ?? null) as AttendanceValue,
        })),
      )
      .sort((left, right) => right.startsAt.localeCompare(left.startsAt));

    return {
      teacher: {
        id: record.teacher.id,
        displayName: record.teacher.displayName ?? 'Teacher',
      },
      school: record.school,
      student: {
        id: record.student.id,
        displayName: record.student.displayName ?? 'Student',
      },
      classes: record.student.classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        subjects: [...new Set(schoolClass.sessions.map(({ subjectName }) => subjectName))],
      })),
      attendance: {
        summary: summarizeAttendance(sessions.map(({ state }) => state)),
        sessions,
      },
      tasks: { attributionAvailable: false, items: [] },
    };
  }
}
