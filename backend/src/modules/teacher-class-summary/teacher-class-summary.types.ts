import type { AssignmentStatusValue } from '../teacher-assignments/teacher-assignments.types.js';

export interface TeacherClassSummaryRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  schoolClass: {
    id: string;
    name: string;
    studentIds: string[];
    sessions: {
      id: string;
      subjectName: string;
      startsAt: Date;
      endsAt: Date;
      state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
      records: { studentId: string; state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' }[];
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
      marks: { studentId: string; value: number }[];
    }[];
  };
}

export interface TeacherClassSummary {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  class: { id: string; name: string; studentCount: number };
  nextSession: { subjectName: string; startsAt: string; endsAt: string } | null;
  attendance: {
    completedSessions: number;
    eligibleRecords: number;
    knownRecords: number;
    missingRecords: number;
    present: number;
    absent: number;
    late: number;
    partial: number;
    presentRate: number | null;
  };
  assignments: {
    total: number;
    active: number;
    dueSoon: number;
    items: {
      id: string;
      title: string;
      subjectName: string;
      dueAt: string | null;
      status: AssignmentStatusValue;
    }[];
  };
  assessments: {
    total: number;
    recordedMarks: number;
    missingMarks: number;
    normalizedAverage: number | null;
    items: {
      id: string;
      title: string;
      subjectName: string;
      maximumMarks: number;
      assessedAt: string;
      recordedCount: number;
      missingCount: number;
      normalizedAverage: number | null;
    }[];
  };
}
