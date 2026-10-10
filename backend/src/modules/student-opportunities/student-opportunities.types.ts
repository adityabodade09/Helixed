export type Opportunity = {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  source: string | null;
  location: string | null;
  deadline: string | null;
  isOpen: boolean;
  saved: boolean;
  application: { id: string; state: string; submittedAt: string | null } | null;
};
