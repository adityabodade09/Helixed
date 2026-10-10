import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { StudentGrowthPage } from './StudentGrowthPage';
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'token', user: { displayName: 'Aarav Sharma' } }),
}));
vi.mock('./studentGrowth.api', () => ({
  growthApi: {
    get: vi.fn().mockResolvedValue({
      studentName: 'Aarav Sharma',
      dimensions: [{ name: 'Academic Development', value: 75, evidence: '2 subjects' }],
      academics: { subjects: [], taskCompletion: 0 },
      activities: [],
      patterns: { tasksCreated: 0, tasksCompleted: 0, groupMemberships: 0, activeActivities: 0 },
      achievements: [],
    }),
  },
}));
describe('StudentGrowthPage', () => {
  it('renders canonical growth evidence', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <StudentGrowthPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Academic Development')).toBeInTheDocument();
  });
});
