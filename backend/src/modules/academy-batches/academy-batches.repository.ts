import type { AcademyDashboardRepository } from '../academy-dashboard/academy-dashboard.repository.js';
import type { AcademyBatchDetailRecord } from './academy-batches.types.js';

export interface AcademyBatchesRepository extends AcademyDashboardRepository {
  batchDetail(
    academyId: string,
    batchId: string,
    now: Date,
  ): Promise<AcademyBatchDetailRecord | null>;
}
