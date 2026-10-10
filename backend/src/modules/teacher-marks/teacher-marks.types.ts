export interface TeacherMarksRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    studentCount: number;
    assessments: {
      id: string;
      title: string;
      subjectName: string;
      maximumMarks: number;
      assessedAt: Date;
      recordedCount: number;
    }[];
  }[];
}

export interface TeacherMarkAssessmentRecord {
  id: string;
  title: string;
  subjectName: string;
  maximumMarks: number;
  assessedAt: Date;
  schoolClass: { id: string; name: string };
  students: {
    id: string;
    displayName: string | null;
    mark: { id: string; value: number; recordedAt: Date } | null;
  }[];
}

export interface TeacherMarks {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string }[];
  summary: { totalAssessments: number; complete: number; pendingEntry: number };
  assessments: {
    id: string;
    title: string;
    class: { id: string; name: string };
    subjectName: string;
    maximumMarks: number;
    assessedAt: string;
    rosterCount: number;
    recordedCount: number;
    missingCount: number;
  }[];
}

export interface TeacherMarkAssessment {
  id: string;
  title: string;
  class: { id: string; name: string };
  subjectName: string;
  maximumMarks: number;
  assessedAt: string;
  roster: {
    studentId: string;
    displayName: string;
    mark: number | null;
    currentMarkId: string | null;
    recordedAt: string | null;
  }[];
}

export interface MarkWrite {
  studentId: string;
  value: number;
  expectedMarkId: string | null;
}

export type MarkWriteResult = 'SUCCESS' | 'NOT_AVAILABLE' | 'CONFLICT' | 'OUT_OF_RANGE';
