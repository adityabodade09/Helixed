import { apiRequest } from '../../services/api/apiClient';

export type ParentApprovalStatus = 'PENDING' | 'APPROVED' | 'DECLINED';
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

const base = '/parent/approvals';
export const parentApprovalsApi = {
  list: (token: string) => apiRequest<ParentApproval[]>(base, { accessToken: token }),
  decide: (token: string, approvalId: string, decision: 'APPROVED' | 'DECLINED') =>
    apiRequest<ParentApproval>(`${base}/${approvalId}/decision`, {
      accessToken: token,
      method: 'POST',
      body: { decision },
    }),
};
