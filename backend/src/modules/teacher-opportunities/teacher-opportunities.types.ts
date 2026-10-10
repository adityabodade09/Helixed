export type TeacherOpportunityAvailability = 'OPEN' | 'CLOSED';

export type TeacherOpportunityFilters = {
  search?: string;
  category?: string;
  availability?: TeacherOpportunityAvailability;
};

export type TeacherOpportunity = {
  id: string;
  title: string;
  detail: string | null;
  description: string | null;
  category: string | null;
  provider: string | null;
  location: string | null;
  deadline: string | null;
  availability: TeacherOpportunityAvailability;
};

export type TeacherOpportunityCatalog = {
  teacher: { id: string; displayName: string | null };
  school: { id: string; name: string };
  categories: string[];
  opportunities: TeacherOpportunity[];
};
