import type {
  ApprovalResolutionResult,
  ParentApproval,
  ParentApprovalDecision,
} from './parent-approvals.types.js';

export interface ParentApprovalsRepository {
  findParentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
  list(parentId: string, now: Date): Promise<ParentApproval[]>;
  find(approvalId: string): Promise<ParentApproval | null>;
  resolveAtomic(
    approvalId: string,
    resolverId: string,
    decision: ParentApprovalDecision,
    now: Date,
  ): Promise<ApprovalResolutionResult>;
}
