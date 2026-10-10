import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ParentInsightsPage } from './ParentInsightsPage';
import { parentInsightsApi, type ParentInsights } from './parentInsights.api';

vi.mock('./parentInsights.api', () => ({ parentInsightsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'token' }) }));

const populated: ParentInsights = {
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  period: {
    label: 'Last 6 weeks',
    startsAt: '2026-08-20T00:00:00.000Z',
    endsAt: '2026-10-01T00:00:00.000Z',
    upcomingEndsAt: '2026-10-08T00:00:00.000Z',
  },
  subjects: [{ id: 'subject-1', name: 'Mathematics', progress: 82 }],
  attendance: {
    scheduledSessions: 3,
    knownSessions: 2,
    missingSessions: 1,
    present: 1,
    absent: 1,
    late: 0,
    partial: 0,
    presentRate: 50,
  },
  tasks: {
    total: 2,
    completed: 1,
    overdue: 0,
    upcoming: 1,
    open: 0,
    completedWithDeadline: 1,
    completedOnTime: 1,
    dueThisWeek: 1,
  },
  activities: {
    active: 1,
    milestones: 2,
    completedMilestones: 1,
    certificates: 1,
    items: [
      {
        id: 'activity-1',
        title: 'Robotics Club',
        active: true,
        milestones: 2,
        completedMilestones: 1,
      },
    ],
  },
  upcoming: {
    tasks: [{ id: 'task-1', title: 'Physics worksheet', at: '2026-10-03T00:00:00.000Z' }],
    exams: [],
    schedule: [],
  },
  facts: [
    {
      id: 'attendance-known',
      category: 'ATTENDANCE',
      statement: '1 of 2 known attendance records are present.',
      evidence: '1 completed session has no official record.',
    },
  ],
  hasEvidence: true,
};

const sparse: ParentInsights = {
  ...populated,
  child: { id: 'child-2', displayName: 'Mira Sharma' },
  subjects: [],
  attendance: {
    scheduledSessions: 0,
    knownSessions: 0,
    missingSessions: 0,
    present: 0,
    absent: 0,
    late: 0,
    partial: 0,
    presentRate: null,
  },
  tasks: {
    total: 0,
    completed: 0,
    overdue: 0,
    upcoming: 0,
    open: 0,
    completedWithDeadline: 0,
    completedOnTime: 0,
    dueThisWeek: 0,
  },
  activities: { active: 0, milestones: 0, completedMilestones: 0, certificates: 0, items: [] },
  upcoming: { tasks: [], exams: [], schedule: [] },
  facts: [],
  hasEvidence: false,
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentInsightsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentInsightsApi.get).mockImplementation(async (_token, childId) =>
      childId === 'child-2' ? sparse : populated,
    );
  });

  it('renders factual insight cards with understandable evidence', async () => {
    renderPage();
    expect(await screen.findByText('Evidence for Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('50% present')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 known attendance records are present.')).toBeInTheDocument();
    expect(screen.getByText(/Evidence: 1 completed session/)).toBeInTheDocument();
    expect(screen.getByText('Physics worksheet')).toBeInTheDocument();
  });

  it('switches the complete child context without retaining sibling evidence', async () => {
    renderPage();
    const selector = await screen.findByRole('combobox', { name: 'Child' });
    fireEvent.change(selector, { target: { value: 'child-2' } });
    expect(await screen.findByText('Evidence for Mira Sharma')).toBeInTheDocument();
    expect(screen.getByText('Not enough recorded data')).toBeInTheDocument();
    expect(screen.queryByText('Physics worksheet')).not.toBeInTheDocument();
    expect(parentInsightsApi.get).toHaveBeenLastCalledWith('token', 'child-2');
  });

  it('does not render profiling, ranking, prediction, or Student AI language', async () => {
    renderPage();
    await screen.findByText('Evidence for Aarav Sharma');
    expect(document.body.textContent).not.toMatch(
      /intelligent|personality|lazy|gifted|ranking|prediction|AI conversation/i,
    );
    expect(screen.queryByText(/compare siblings/i)).not.toBeInTheDocument();
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(parentInsightsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading insights…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(parentInsightsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Insights are unavailable for this account.'),
    ).toBeInTheDocument();
  });

  it('shows missing attendance as missing rather than absent', async () => {
    renderPage();
    await screen.findByText('Evidence for Aarav Sharma');
    expect(screen.getByText('2 known · 1 missing')).toBeInTheDocument();
    const missing = screen.getByText('Missing').closest('div');
    expect(missing).toHaveTextContent('1');
    const absent = screen.getByText('Absent').closest('div');
    expect(absent).toHaveTextContent('1');
  });
});
