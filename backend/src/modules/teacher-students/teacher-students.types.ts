export interface TeacherStudentsRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  students: {
    id: string;
    displayName: string | null;
    classes: { id: string; name: string; subjects: string[] }[];
  }[];
}

export interface TeacherStudentDetailRecord {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  student: {
    id: string;
    displayName: string | null;
    classes: {
      id: string;
      name: string;
      sessions: {
        id: string;
        subjectName: string;
        startsAt: Date;
        endsAt: Date;
        records: { state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' }[];
      }[];
    }[];
  };
}

export interface TeacherStudents {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  classes: { id: string; name: string }[];
  students: {
    id: string;
    displayName: string;
    classes: { id: string; name: string; subjects: string[] }[];
  }[];
}

export interface TeacherStudentDetail {
  teacher: { id: string; displayName: string };
  school: { id: string; name: string };
  student: { id: string; displayName: string };
  classes: { id: string; name: string; subjects: string[] }[];
  attendance: {
    summary: {
      scheduledSessions: number;
      knownSessions: number;
      missingSessions: number;
      present: number;
      absent: number;
      late: number;
      partial: number;
      presentRate: number | null;
    };
    sessions: {
      id: string;
      classId: string;
      className: string;
      subjectName: string;
      startsAt: string;
      endsAt: string;
      state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;
    }[];
  };
  tasks: { attributionAvailable: false; items: [] };
}
