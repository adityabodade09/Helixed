export interface TeacherClasses {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: TeacherClass[];
}

export interface TeacherClass {
  id: string;
  name: string;
  subjects: string[];
  studentCount: number;
  openTaskCount: number;
  attendanceRecordingPending: number;
  nextSession: { subjectName: string; startsAt: string; endsAt: string } | null;
}

export interface TeacherClassDetail extends TeacherClass {
  school: { id: string; name: string };
  recentSessions: {
    id: string;
    subjectName: string;
    startsAt: string;
    endsAt: string;
    state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    knownAttendanceCount: number;
    missingAttendanceCount: number;
    absentAttendanceCount: number;
  }[];
}
