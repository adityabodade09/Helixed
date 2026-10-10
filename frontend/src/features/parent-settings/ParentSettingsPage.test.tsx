import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { ParentSettingsPage } from './ParentSettingsPage';
import { parentSettingsApi, type ParentSettings } from './parentSettings.api';

const auth = vi.hoisted(() => ({ logoutAll: vi.fn() }));
vi.mock('./parentSettings.api', () => ({ parentSettingsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'token',
    user: { id: 'parent-1', displayName: 'Anita Sharma' },
    logoutAll: auth.logoutAll,
  }),
}));

const settings: ParentSettings = {
  account: {
    id: 'parent-1',
    loginIdentifier: 'parent-demo',
    displayName: 'Anita Sharma',
    accountState: 'ACTIVE',
  },
  sessions: [
    {
      id: 'session-1',
      createdAt: '2026-10-01T08:00:00.000Z',
      lastSeenAt: '2026-10-01T09:00:00.000Z',
      expiresAt: '2026-10-08T08:00:00.000Z',
      current: true,
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/parent/settings']}>
        <ParentSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ParentSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentSettingsApi.get).mockResolvedValue(settings);
    auth.logoutAll.mockResolvedValue(undefined);
  });

  it('renders the Parent account and safe current-session information', async () => {
    renderPage();
    expect(await screen.findByText('parent-demo')).toBeInTheDocument();
    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/passwordHash|refreshToken|tokenHash|Aarav|Neha/);
  });

  it('uses canonical logout-all without exposing child account controls', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of all sessions' }));
    await waitFor(() => expect(auth.logoutAll).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: /child password|child session/i })).toBeNull();
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(parentSettingsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading account settings…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(parentSettingsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Settings are unavailable for this account.'),
    ).toBeInTheDocument();
  });

  it('reports logout-all failure without presenting unsupported controls', async () => {
    auth.logoutAll.mockRejectedValue(new Error('failed'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of all sessions' }));
    expect(await screen.findByText('Unable to sign out all sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
