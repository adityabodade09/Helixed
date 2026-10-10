import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { StudentCommunityPage } from './StudentCommunityPage';

vi.mock('./studentCommunity.api', () => ({
  communityApi: {
    inbox: vi.fn().mockResolvedValue([
      {
        id: 'one',
        kind: 'direct',
        title: 'Priya Sharma',
        preview: 'Hello',
        updatedAt: '2026-09-30T10:00:00.000Z',
      },
    ]),
    sent: vi.fn(),
    groups: vi.fn(),
    direct: vi.fn(),
  },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'token', user: { id: 'student', displayName: 'Aarav Sharma' } }),
}));
function renderPage() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <StudentCommunityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe('StudentCommunityPage', () => {
  it('renders authenticated inbox data', async () => {
    renderPage();
    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument();
  });
});
