import type { AssignmentStatusValue } from '../teacher-assignments/teacher-assignments.types.js';

export interface TeacherDevelopmentScopeRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    students: { id: string; displayName: string | null }[];
  }[];
}

export interface TeacherDevelopmentEvidenceRecord {
  schoolClass: { id: string; name: string };
  student: { id: string; displayName: string | null };
  attendanceSessions: {
    id: string;
    subjectName: string;
    startsAt: Date;
    state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;
  }[];
  assignments: {
    id: string;
    title: string;
    subjectName: string;
    dueAt: Date | null;
    status: AssignmentStatusValue;
  }[];
  assessments: {
    id: string;
    title: string;
    subjectName: string;
    maximumMarks: number;
    assessedAt: Date;
    mark: { value: number } | null;
  }[];
}

export interface TeacherDevelopment {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    students: { id: string; displayName: string }[];
  }[];
  selection: {
    class: { id: string; name: string };
    student: { id: string; displayName: string };
  } | null;
  attendance: {
    known: number;
    missing: number;
    present: number;
    absent: number;
    late: number;
    partial: number;
    presentRate: number | null;
    sessions: {
      id: string;
      subjectName: string;
      startsAt: string;
      state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;
    }[];
  };
  assessments: {
    recorded: number;
    missing: number;
    normalizedAverage: number | null;
    items: {
      id: string;
      title: string;
      subjectName: string;
      maximumMarks: number;
      assessedAt: string;
      mark: number | null;
      normalizedPercent: number | null;
    }[];
  };
  classAssignments: {
    attribution: 'CLASS_CONTEXT_ONLY';
    items: {
      id: string;
      title: string;
      subjectName: string;
      dueAt: string | null;
      status: AssignmentStatusValue;
    }[];
  };
  activityEvidence: { available: false };
}
