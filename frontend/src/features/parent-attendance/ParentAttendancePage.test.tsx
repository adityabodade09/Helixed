import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentAttendancePage } from './ParentAttendancePage';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));
const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/apiClient', () => ({ apiRequest }));

function renderPage(childId = 'student-demo') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/parent/children/${childId}/attendance`]}>
        <Routes>
          <Route path="/parent/children/:id/attendance" element={<ParentAttendancePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentAttendancePage', () => {
  beforeEach(() => apiRequest.mockReset());

  it('renders selected-child records and distinguishes missing from absent', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'student-demo', displayName: 'Aarav Sharma' },
      summary: {
        scheduledSessions: 3,
        knownSessions: 2,
        missingSessions: 1,
        present: 1,
        absent: 1,
        late: 0,
        partial: 0,
        presentRate: 50,
      },
      subjects: [
        {
          subject: 'Mathematics',
          scheduledSessions: 2,
          knownSessions: 1,
          missingSessions: 1,
          present: 1,
          absent: 0,
          late: 0,
          partial: 0,
          presentRate: 100,
        },
      ],
      sessions: [
        {
          id: 'session-1',
          subject: 'Mathematics',
          startsAt: '2026-09-01T08:00:00Z',
          endsAt: '2026-09-01T09:00:00Z',
          state: 'PRESENT',
        },
        {
          id: 'session-2',
          subject: 'Mathematics',
          startsAt: '2026-09-02T08:00:00Z',
          endsAt: '2026-09-02T09:00:00Z',
          state: null,
        },
      ],
    });
    renderPage();
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Awaiting official record')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getByText(/Missing records are not counted as absent/)).toBeInTheDocument();
  });

  it('renders Mira’s true no-attendance-data state', async () => {
    apiRequest.mockResolvedValue({
      child: { id: 'mira-demo', displayName: 'Mira Sharma' },
      summary: {
        scheduledSessions: 0,
        knownSessions: 0,
        missingSessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        partial: 0,
        presentRate: null,
      },
      subjects: [],
      sessions: [],
    });
    renderPage('mira-demo');
    expect(await screen.findByText('Mira Sharma')).toBeInTheDocument();
    expect(screen.getByText('No attendance data')).toBeInTheDocument();
    expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument();
  });
});
