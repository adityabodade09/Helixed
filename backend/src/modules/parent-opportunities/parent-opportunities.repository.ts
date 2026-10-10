import type { ParentOpportunity, ParentOpportunityFilters } from './parent-opportunities.types.js';

export interface ParentOpportunitiesRepository {
  findParentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  children(parentId: string): Promise<{ id: string; displayName: string | null }[]>;
  categories(): Promise<string[]>;
  list(childId: string, filters: ParentOpportunityFilters, now: Date): Promise<ParentOpportunity[]>;
}
