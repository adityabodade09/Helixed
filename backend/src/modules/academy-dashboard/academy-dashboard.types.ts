export interface AcademyDashboardRecord {
  academy: { id: string; name: string };
  enrolledStudentIds: string[];
  batches: {
    id: string;
    name: string;
    studentIds: string[];
    coachIds: string[];
  }[];
}

export interface AcademyDashboard {
  academy: { id: string; name: string };
  summary: {
    enrolledStudents: number;
    batches: number;
    assignedCoaches: number;
  };
  batches: {
    id: string;
    name: string;
    studentCount: number;
    coachCount: number;
  }[];
}
