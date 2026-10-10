import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentTasksPage } from './ParentTasksPage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(childId = 'student-demo') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/parent/children/${childId}/tasks`]}>
        <Routes>
          <Route path="/parent/children/:id/tasks" element={<ParentTasksPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentTasksPage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders an authorized child’s factual task projection and filters it', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      summary: { total: 2, completed: 1, overdue: 0, upcoming: 1, open: 0 },
      tasks: [
        {
          id: '1',
          title: 'Physics practice',
          subject: 'Physics',
          dueAt: '2026-10-05T00:00:00Z',
          priority: 'HIGH',
          completedAt: null,
          state: 'UPCOMING',
        },
        {
          id: '2',
          title: 'Read chapter',
          subject: null,
          dueAt: null,
          priority: 'LOW',
          completedAt: '2026-10-01T00:00:00Z',
          state: 'COMPLETED',
        },
      ],
    });
    renderPage();
    expect(await screen.findByText('Aarav Sharma’s tasks')).toBeInTheDocument();
    expect(screen.getByText('Physics practice')).toBeInTheDocument();
    expect(screen.getByText('No deadline set')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByText('Read chapter')).toBeInTheDocument();
    expect(screen.queryByText('Physics practice')).not.toBeInTheDocument();
  });

  it('renders Mira’s true empty state without sibling task data', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'mira-demo', displayName: 'Mira Sharma' },
      summary: { total: 0, completed: 0, overdue: 0, upcoming: 0, open: 0 },
      tasks: [],
    });
    renderPage('mira-demo');
    expect(await screen.findByText('Mira Sharma’s tasks')).toBeInTheDocument();
    expect(screen.getByText('No tasks are available for this child.')).toBeInTheDocument();
    expect(screen.queryByText('Physics practice')).not.toBeInTheDocument();
  });

  it('renders the non-revealing restricted state when child access fails', async () => {
    apiRequest.mockResolvedValue(null);
    renderPage('foreign-child');
    expect(
      await screen.findByText('Tasks are unavailable in this authorized child context.'),
    ).toBeInTheDocument();
  });
});
