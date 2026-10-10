export type ParentOpportunityAvailability = 'OPEN' | 'CLOSED';

export type ParentOpportunity = {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  provider: string | null;
  location: string | null;
  deadline: string | null;
  availability: ParentOpportunityAvailability;
  approvalPending: boolean;
};

export type ParentOpportunityFilters = {
  search?: string;
  category?: string;
  availability?: ParentOpportunityAvailability;
};
