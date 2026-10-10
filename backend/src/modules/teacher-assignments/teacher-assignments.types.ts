export type AssignmentStatusValue =
  'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'ARCHIVED' | 'CANCELLED';

export interface TeacherAssignmentsRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    subjects: string[];
    assignments: {
      id: string;
      title: string;
      subjectName: string;
      dueAt: Date | null;
      status: AssignmentStatusValue;
      createdAt: Date;
    }[];
  }[];
}

export interface TeacherAssignments {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string; subjects: string[] }[];
  summary: { total: number; active: number; dueThisWeek: number };
  assignments: {
    id: string;
    title: string;
    class: { id: string; name: string };
    subjectName: string;
    dueAt: string | null;
    status: AssignmentStatusValue;
    createdAt: string;
  }[];
}

export interface CreateAssignmentInput {
  classId: string;
  title: string;
  description?: string;
  subjectName: string;
  dueAt?: string;
  status: 'DRAFT' | 'PUBLISHED';
}

export type TeacherAssignment = TeacherAssignments['assignments'][number];
