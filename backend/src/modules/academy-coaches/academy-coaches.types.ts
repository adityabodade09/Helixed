export interface AcademyCoachFilters {
  search?: string;
}

export interface AcademyCoachesRecord {
  academy: { id: string; name: string };
  coaches: {
    user: { id: string; displayName: string | null };
    joinedAt: Date;
    batches: { id: string; name: string }[];
  }[];
}

export interface AcademyCoachesResponse {
  academy: { id: string; name: string };
  summary: { coaches: number };
  coaches: {
    id: string;
    displayName: string;
    joinedAt: string;
    batchCount: number;
    batches: { id: string; name: string }[];
  }[];
}
