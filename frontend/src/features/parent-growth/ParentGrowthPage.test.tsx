import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentGrowthPage } from './ParentGrowthPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));
const data = {
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  dimensions: [{ name: 'Academic development', value: 82, evidence: '3 subjects' }],
  academics: {
    subjects: [{ id: 'subject-1', name: 'Mathematics', progress: 82 }],
    taskCompletion: 75,
  },
  activities: [
    {
      id: 'activity-1',
      title: 'Robotics Club',
      category: 'Technology',
      milestones: 4,
      completedMilestones: 2,
    },
  ],
  patterns: { tasksCreated: 8, tasksCompleted: 6, activeActivities: 1, certificates: 2 },
  achievements: [
    { id: 'certificate-1', title: 'Robotics certificate', category: 'Certificate', date: null },
  ],
};
function renderPage(page?: 'overview' | 'academics' | 'activities' | 'patterns' | 'achievements') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentGrowthPage page={page} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe('ParentGrowthPage', () => {
  beforeEach(() => apiRequest.mockReset());
  it('renders parent-visible evidence and child selector', async () => {
    apiRequest.mockResolvedValue(data);
    renderPage();
    expect(await screen.findByText("Aarav Sharma's growth")).toBeInTheDocument();
    expect(screen.getByText('Academic development')).toBeInTheDocument();
    expect(screen.getByText('Robotics certificate')).toBeInTheDocument();
  });
  it('supports child selection and activity evidence', async () => {
    apiRequest.mockResolvedValue(data);
    renderPage('activities');
    const selector = await screen.findByRole('combobox', { name: 'Child' });
    expect(screen.getByText('Robotics Club')).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'child-2' } });
    expect(selector).toHaveValue('child-2');
  });
  it('shows empty activity evidence', async () => {
    apiRequest.mockResolvedValue({ ...data, activities: [] });
    renderPage('activities');
    expect(await screen.findByText('No parent-visible activity evidence yet.')).toBeInTheDocument();
  });
});
