import type { AcademyCoachesRecord, AcademyCoachFilters } from './academy-coaches.types.js';

export interface AcademyCoachesRepository {
  list(
    academyId: string,
    filters: AcademyCoachFilters,
    now: Date,
  ): Promise<AcademyCoachesRecord | null>;
}
