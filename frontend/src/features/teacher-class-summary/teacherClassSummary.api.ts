import { apiRequest } from '../../services/api/apiClient';
import type { AssignmentStatus } from '../teacher-assignments/teacherAssignments.api';

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
      status: AssignmentStatus;
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

export const teacherClassSummaryApi = {
  get: (token: string, classId: string) =>
    apiRequest<TeacherClassSummary>(
      `/teacher/class-summary?classId=${encodeURIComponent(classId)}`,
      { accessToken: token },
    ),
};
