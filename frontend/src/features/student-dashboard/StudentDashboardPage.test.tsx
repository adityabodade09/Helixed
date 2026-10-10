import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/auth.context';
import type { AuthContextValue } from '../auth/auth.context';
import { StudentDashboardPage, StudentDashboardView } from './StudentDashboardPage';
import type { StudentDashboard } from './studentDashboard.types';

const dashboard: StudentDashboard = {
  student: { displayName: 'Aarav Sharma' },
  today: '2026-09-22T00:00:00.000Z',
  summary: {
    classesToday: 3,
    tasksDue: 3,
    upcomingExam: { title: 'Mathematics', startsAt: '2026-09-29T10:00:00.000Z' },
    overallProgress: 78,
  },
  schedule: [
    {
      id: 'schedule-1',
      title: 'Physics',
      detail: 'Room A-201',
      startsAt: '2026-09-22T08:00:00.000Z',
      color: 'blue',
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Complete physics assignment',
      dueAt: '2026-09-22T23:59:00.000Z',
      priority: 'high',
    },
  ],
  subjects: [{ id: 'subject-1', name: 'Mathematics', progress: 82, nextClassAt: null }],
  activities: [],
  announcements: [],
  opportunities: [],
};

const auth: AuthContextValue = {
  accessToken: 'test-token',
  status: 'authenticated',
  user: {
    id: 'student-1',
    loginIdentifier: 'student-1',
    displayName: 'Aarav Sharma',
    accountState: 'ACTIVE',
  },
  login: async () => undefined,
  logout: async () => undefined,
  logoutAll: async () => undefined,
};

describe('StudentDashboardPage', () => {
  it('renders database-backed dashboard content', () => {
    render(
      <MemoryRouter>
        <StudentDashboardView dashboard={dashboard} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Good morning,')).toBeInTheDocument();
    expect(screen.getByText('Complete physics assignment')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('renders an error state when the dashboard API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={auth}>
          <StudentDashboardPage />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('Your dashboard is unavailable')).toBeInTheDocument(),
    );
  });
});
