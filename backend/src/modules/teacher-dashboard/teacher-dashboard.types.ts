export interface TeacherDashboardRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  classes: {
    id: string;
    name: string;
    studentIds: string[];
    openTaskCount: number;
    sessions: {
      id: string;
      subjectName: string;
      startsAt: Date;
      endsAt: Date;
      state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
      records: { studentId: string; state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' }[];
    }[];
  }[];
}

export interface TeacherDashboard {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  summary: {
    assignedClasses: number;
    authorizedStudents: number;
    openStudentTasks: number;
    attendanceSessionsPending: number;
  };
  classes: {
    id: string;
    name: string;
    studentCount: number;
    sessionSubjects: string[];
    openTaskCount: number;
  }[];
  upcomingSessions: TeacherSession[];
  recentSessions: TeacherSession[];
}

export interface TeacherSession {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
  state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  attendance: {
    expectedStudents: number;
    knownRecords: number;
    missingRecords: number;
    absentRecords: number;
  };
}
