export interface AcademyBatchFilters {
  search?: string;
}

export interface AcademyBatchesResponse {
  academy: { id: string; name: string };
  summary: {
    batches: number;
    enrolledStudents: number;
    assignedCoaches: number;
  };
  batches: {
    id: string;
    name: string;
    studentCount: number;
    coachCount: number;
  }[];
}

export interface AcademyBatchDetailRecord {
  academy: { id: string; name: string };
  batch: { id: string; name: string };
  students: { id: string; displayName: string | null }[];
  coaches: { id: string; displayName: string | null }[];
}

export interface AcademyBatchDetailResponse {
  academy: { id: string; name: string };
  batch: { id: string; name: string };
  summary: { students: number; coaches: number };
  students: { id: string; displayName: string }[];
  coaches: { id: string; displayName: string }[];
}
