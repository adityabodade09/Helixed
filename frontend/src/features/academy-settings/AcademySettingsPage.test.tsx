import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademySettingsPage } from './AcademySettingsPage';
import { academySettingsApi, type AcademySettings } from './academySettings.api';

const auth = vi.hoisted(() => ({ logoutAll: vi.fn() }));
vi.mock('./academySettings.api', () => ({ academySettingsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'token', logoutAll: auth.logoutAll }),
}));

const settings: AcademySettings = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  account: {
    id: 'owner-1',
    loginIdentifier: 'academy-demo',
    displayName: 'Maya Rao',
    accountState: 'ACTIVE',
  },
  sessions: [
    {
      id: 'session-1',
      createdAt: '2026-10-04T08:00:00.000Z',
      lastSeenAt: '2026-10-04T09:00:00.000Z',
      expiresAt: '2026-10-11T08:00:00.000Z',
      current: true,
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/academy/settings']}>
        <AcademySettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academySettingsApi.get).mockResolvedValue(settings);
    auth.logoutAll.mockResolvedValue(undefined);
  });

  it('renders own account, exact Academy context, sanitized session, and active navigation', async () => {
    renderPage();
    expect(await screen.findByText('academy-demo')).toBeInTheDocument();
    expect(screen.getAllByText('Helixed Skills Academy').length).toBeGreaterThan(0);
    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveClass('text-blue-700');
    expect(document.body.textContent).not.toMatch(
      /passwordHash|refreshToken|tokenHash|permission|roleAssignment|parent-demo/i,
    );
  });

  it('uses canonical logout-all and prevents duplicate submission while pending', async () => {
    auth.logoutAll.mockReturnValue(new Promise<never>(() => {}));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of all sessions' }));
    const pending = await screen.findByRole('button', { name: 'Signing out…' });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(auth.logoutAll).toHaveBeenCalledTimes(1);
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(academySettingsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading account settings…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(academySettingsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy settings are unavailable.')).toBeInTheDocument();
  });

  it('reports logout failure and omits unsupported controls', async () => {
    auth.logoutAll.mockRejectedValue(new Error('failed'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of all sessions' }));
    await waitFor(() => expect(auth.logoutAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Unable to sign out all sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /password|email|MFA|billing|invite|delete/i }),
    ).toBeNull();
  });
});
