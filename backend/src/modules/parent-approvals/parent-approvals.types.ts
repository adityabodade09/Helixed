export type ParentApprovalDecision = 'APPROVED' | 'DECLINED';
export type ParentApprovalStatus = 'PENDING' | ParentApprovalDecision;

export type ParentApproval = {
  id: string;
  child: { id: string; displayName: string };
  type: 'OPPORTUNITY_APPLICATION';
  target: {
    id: string;
    opportunityId: string;
    title: string;
    detail: string | null;
    category: string | null;
    deadline: string | null;
  };
  status: ParentApprovalStatus;
  requestedAt: string;
  resolvedAt: string | null;
  targetAvailable: boolean;
};

export type ApprovalResolutionResult =
  | { kind: 'resolved'; approval: ParentApproval }
  | { kind: 'missing' | 'already-resolved' | 'invalid-target' };
