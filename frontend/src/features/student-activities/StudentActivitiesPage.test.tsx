import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../auth/auth.context';
import type { AuthContextValue } from '../auth/auth.context';
import { StudentActivitiesPage } from './StudentActivitiesPage';
const auth: AuthContextValue = {
  accessToken: 'test-token',
  status: 'authenticated',
  user: {
    id: 'student',
    loginIdentifier: 'student',
    displayName: 'Aarav Sharma',
    accountState: 'ACTIVE',
  },
  login: async () => undefined,
  logout: async () => undefined,
  logoutAll: async () => undefined,
};
function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthContext.Provider value={auth}>
          <StudentActivitiesPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
describe('StudentActivitiesPage', () => {
  it('renders activity API data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'activity-1',
            title: 'Football',
            category: 'Sports',
            status: 'active',
            startedAt: '2025-08-15T00:00:00.000Z',
            organization: 'School Team',
            description: null,
          },
        ]),
        { status: 200 },
      ),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Football')).toBeInTheDocument());
  });
  it('renders an error state', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    renderPage();
    await waitFor(() => expect(screen.getByText('Activities are unavailable')).toBeInTheDocument());
  });
});
