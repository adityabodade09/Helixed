import type { Opportunity } from './student-opportunities.types.js';
export interface StudentOpportunitiesRepository {
  findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  list(userId: string, query?: string, category?: string): Promise<Opportunity[]>;
  get(userId: string, id: string): Promise<Opportunity | null>;
  save(userId: string, id: string): Promise<Opportunity | null>;
  unsave(userId: string, id: string): Promise<boolean>;
  apply(
    userId: string,
    id: string,
    note?: string,
  ): Promise<Opportunity | 'duplicate' | 'closed' | null>;
}
