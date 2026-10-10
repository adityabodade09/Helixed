export interface AcademyStudentsRecord {
  academy: { id: string; name: string };
  batches: { id: string; name: string }[];
  enrollments: {
    student: { id: string; displayName: string | null };
    enrolledAt: Date;
    batches: { id: string; name: string }[];
  }[];
}

export interface AcademyStudentsResponse {
  academy: { id: string; name: string };
  batches: { id: string; name: string }[];
  students: {
    id: string;
    displayName: string;
    enrolledAt: string;
    batches: { id: string; name: string }[];
  }[];
}

export interface AcademyStudentDetailRecord {
  academy: { id: string; name: string };
  student: {
    id: string;
    displayName: string | null;
    enrolledAt: Date;
    batches: { id: string; name: string }[];
  };
}

export interface AcademyStudentDetailResponse {
  academy: { id: string; name: string };
  student: {
    id: string;
    displayName: string;
    enrolledAt: string;
    batches: { id: string; name: string }[];
  };
}

export interface AcademyStudentFilters {
  search?: string;
  batchId?: string;
}
