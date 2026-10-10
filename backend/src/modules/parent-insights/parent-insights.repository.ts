import type { ParentInsightEvidence } from './parent-insights.types.js';

export interface ParentInsightsRepository {
  findParentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  children(parentId: string): Promise<{ id: string; displayName: string | null }[]>;
  evidence(
    childId: string,
    periodStart: Date,
    now: Date,
    upcomingEnd: Date,
  ): Promise<ParentInsightEvidence | null>;
}
