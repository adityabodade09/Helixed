export interface ActivitySummary {
  id: string;
  title: string;
  category: string | null;
  status: 'active' | 'inactive';
  startedAt: string | null;
  organization: string | null;
  description: string | null;
}
export interface ActivityProgress {
  id: string;
  title: string;
  detail: string | null;
  occurredAt: string;
}
export interface ActivityMilestone {
  id: string;
  title: string;
  progress: number;
  completedAt: string | null;
}
export interface ActivityCertificate {
  id: string;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  state: 'verified' | 'pending' | 'not_verified';
  activity: { id: string; title: string } | null;
}
export interface ActivityDetail extends ActivitySummary {
  progress: ActivityProgress[];
  milestones: ActivityMilestone[];
  certificates: ActivityCertificate[];
}
