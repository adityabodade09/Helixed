import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentChildDetailPage, ParentChildrenPage } from './ParentChildrenPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(children: React.ReactNode, initialEntries?: string[]) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentChildrenPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders only the linked children as separate contexts', async () => {
    apiRequest.mockResolvedValue({
      children: [
        { id: 'child-1', displayName: 'Aarav Sharma' },
        { id: 'child-2', displayName: 'Mira Sharma' },
      ],
    });
    renderPage(<ParentChildrenPage />);
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Mira Sharma')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View child overview' })[0]).toHaveAttribute(
      'href',
      '/parent/children/child-1',
    );
  });

  it('renders the no-linked-child state', async () => {
    apiRequest.mockResolvedValue({ children: [] });
    renderPage(<ParentChildrenPage />);
    expect(await screen.findByText('No linked children')).toBeInTheDocument();
  });

  it('renders a selected child overview without sibling data', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'child-1', displayName: 'Aarav Sharma' },
      overview: { openTasks: 2, activeActivities: 1, upcomingExams: 1, upcomingScheduleItems: 3 },
    });
    renderPage(
      <Routes>
        <Route path="/parent/children/:id" element={<ParentChildDetailPage />} />
      </Routes>,
      ['/parent/children/child-1'],
    );
    expect(await screen.findByText('Verified child context')).toBeInTheDocument();
    expect(screen.getByText('Open tasks')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Academics →' })).toHaveAttribute(
      'href',
      '/parent/children/child-1/academics',
    );
    expect(screen.getByRole('link', { name: 'Attendance →' })).toHaveAttribute(
      'href',
      '/parent/children/child-1/attendance',
    );
    expect(screen.getByRole('link', { name: 'Tasks →' })).toHaveAttribute(
      'href',
      '/parent/children/child-1/tasks',
    );
    expect(screen.getByRole('link', { name: 'Activities →' })).toHaveAttribute(
      'href',
      '/parent/children/child-1/activities',
    );
    expect(screen.getByRole('link', { name: 'Calendar →' })).toHaveAttribute(
      'href',
      '/parent/children/child-1/calendar',
    );
    expect(screen.getByRole('link', { name: 'Teachers →' })).toHaveAttribute(
      'href',
      '/parent/children/child-1/teachers',
    );
    expect(screen.queryByText('Mira Sharma')).not.toBeInTheDocument();
  });
});
