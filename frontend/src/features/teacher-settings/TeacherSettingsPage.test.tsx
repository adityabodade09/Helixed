import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherSettingsPage } from './TeacherSettingsPage';
import { teacherSettingsApi, type TeacherSettings } from './teacherSettings.api';

const auth = vi.hoisted(() => ({ logoutAll: vi.fn() }));
vi.mock('./teacherSettings.api', () => ({ teacherSettingsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
    logoutAll: auth.logoutAll,
  }),
}));

const settings: TeacherSettings = {
  account: {
    id: 'teacher-1',
    loginIdentifier: 'teacher-demo',
    displayName: 'Neha Kapoor',
    accountState: 'ACTIVE',
  },
  sessions: [
    {
      id: 'session-1',
      createdAt: '2026-10-03T08:00:00.000Z',
      lastSeenAt: '2026-10-03T09:00:00.000Z',
      expiresAt: '2026-10-10T08:00:00.000Z',
      current: true,
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/settings']}>
        <TeacherSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherSettingsApi.get).mockResolvedValue(settings);
    auth.logoutAll.mockResolvedValue(undefined);
  });

  it('renders the Teacher account, safe session state, and active navigation', async () => {
    renderPage();
    expect(await screen.findByText('teacher-demo')).toBeInTheDocument();
    expect(screen.getByText('Current session')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveClass('text-blue-700');
    expect(document.body.textContent).not.toMatch(
      /passwordHash|refreshToken|tokenHash|Aarav|Anita|permission/i,
    );
  });

  it('uses canonical logout-all and prevents duplicate submission while pending', async () => {
    auth.logoutAll.mockReturnValue(new Promise<never>(() => {}));
    renderPage();
    const button = await screen.findByRole('button', { name: 'Sign out of all sessions' });
    fireEvent.click(button);
    expect(await screen.findByRole('button', { name: 'Signing out…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Signing out…' }));
    expect(auth.logoutAll).toHaveBeenCalledTimes(1);
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(teacherSettingsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const view = renderPage();
    expect(screen.getByText('Loading account settings…')).toBeInTheDocument();
    view.unmount();

    vi.mocked(teacherSettingsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Settings are unavailable for this account.'),
    ).toBeInTheDocument();
  });

  it('reports logout failure and omits unsupported controls and secrets', async () => {
    auth.logoutAll.mockRejectedValue(new Error('failed'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of all sessions' }));
    await waitFor(() => expect(auth.logoutAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Unable to sign out all sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /password|email|MFA|delete/i })).toBeNull();
  });
});
