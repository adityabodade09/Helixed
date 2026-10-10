import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentChildActivitiesPage } from './ParentActivitiesPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(childId = 'student-demo') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/parent/children/${childId}/activities`]}>
        <Routes>
          <Route path="/parent/children/:id/activities" element={<ParentChildActivitiesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const activity = {
  id: 'activity-1',
  title: 'Football',
  category: 'Sports',
  status: 'ACTIVE' as const,
  startedAt: '2026-01-01T00:00:00.000Z',
  occursAt: null,
  organization: 'School Team',
  _count: { progressEntries: 2, milestones: 3, certificates: 1 },
};

describe('ParentChildActivitiesPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders only the selected child’s activity projection', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      activities: [activity],
      certificates: [],
    });
    renderPage();
    expect(await screen.findByText("Aarav Sharma's activities")).toBeInTheDocument();
    expect(screen.getByText('Football')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Child overview' })).toHaveAttribute(
      'href',
      '/parent/children/student-demo',
    );
    expect(apiRequest).toHaveBeenCalledWith('/parent/children/student-demo/activities', {
      accessToken: 'token',
    });
  });

  it('renders Mira’s true empty state without sibling activity data', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'mira-demo', displayName: 'Mira Sharma' },
      activities: [],
      certificates: [],
    });
    renderPage('mira-demo');
    expect(await screen.findByText("Mira Sharma's activities")).toBeInTheDocument();
    expect(screen.getByText('No parent-visible activities yet.')).toBeInTheDocument();
    expect(screen.queryByText('Football')).not.toBeInTheDocument();
  });

  it('renders a loading state before the child activity projection resolves', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      activities: [activity],
      certificates: [],
    });
    renderPage();
    expect(screen.getByText('Loading activities…')).toBeInTheDocument();
    expect(await screen.findByText("Aarav Sharma's activities")).toBeInTheDocument();
  });

  it('renders a non-revealing restricted state when child access fails', async () => {
    apiRequest.mockResolvedValue(null);
    renderPage('foreign-child');
    expect(await screen.findByText('Activities are unavailable.')).toBeInTheDocument();
  });
});
