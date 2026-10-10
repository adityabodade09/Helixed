import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ParentApprovalsPage } from './ParentApprovalsPage';
import { parentApprovalsApi, type ParentApproval } from './parentApprovals.api';

vi.mock('./parentApprovals.api', () => ({
  parentApprovalsApi: { list: vi.fn(), decide: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'token', user: { id: 'parent-1', displayName: 'Anita' } }),
}));

const pending: ParentApproval = {
  id: 'approval-1',
  child: { id: 'student-1', displayName: 'Aarav Sharma' },
  type: 'OPPORTUNITY_APPLICATION',
  target: {
    id: 'application-1',
    opportunityId: 'opportunity-1',
    title: 'National Robotics Challenge',
    detail: 'Build a team prototype.',
    category: 'Competition',
    deadline: '2026-12-10T00:00:00.000Z',
  },
  status: 'PENDING',
  requestedAt: '2026-10-01T10:00:00.000Z',
  resolvedAt: null,
  targetAvailable: true,
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentApprovalsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentApprovalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentApprovalsApi.list).mockResolvedValue([pending]);
    vi.mocked(parentApprovalsApi.decide).mockImplementation(async (_token, _id, decision) => ({
      ...pending,
      status: decision,
      resolvedAt: '2026-10-01T11:00:00.000Z',
    }));
  });

  it('renders a pending request with explicit child context and no sibling comparison', async () => {
    renderPage();
    expect(await screen.findByText('National Robotics Challenge')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Mira Sharma')).not.toBeInTheDocument();
    expect(screen.queryByText(/compare|ranking/i)).not.toBeInTheDocument();
  });

  it('saves an approved decision only after the backend accepts it', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(parentApprovalsApi.decide).toHaveBeenCalledWith('token', 'approval-1', 'APPROVED'),
    );
    expect(await screen.findByText('Decision saved: approved.')).toBeInTheDocument();
  });

  it('requires explicit decline confirmation', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    expect(screen.getByText('Decline this request?')).toBeInTheDocument();
    expect(parentApprovalsApi.decide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));
    await waitFor(() =>
      expect(parentApprovalsApi.decide).toHaveBeenCalledWith('token', 'approval-1', 'DECLINED'),
    );
  });

  it('shows loading, empty, and restricted states', async () => {
    vi.mocked(parentApprovalsApi.list).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading approvals…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(parentApprovalsApi.list).mockResolvedValue([]);
    const empty = renderPage();
    expect(await screen.findByText('No pending approvals')).toBeInTheDocument();
    empty.unmount();

    vi.mocked(parentApprovalsApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Approvals are unavailable for this account.'),
    ).toBeInTheDocument();
  });

  it('keeps a stale decision uncommitted and reports the failure', async () => {
    vi.mocked(parentApprovalsApi.decide).mockRejectedValue(new Error('conflict'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(
      await screen.findByText(
        'This decision could not be saved. Refresh to check the current request status.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
});
