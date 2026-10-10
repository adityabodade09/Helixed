import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ParentDashboardPage } from './ParentDashboardPage';
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'token', user: { displayName: 'Anita Sharma' } }),
}));
const data = vi.hoisted(() => ({
  children: [
    { id: 'child-1', displayName: 'Aarav Sharma' },
    { id: 'child-2', displayName: 'Mira Sharma' },
  ],
  child: { id: 'child-1', displayName: 'Aarav Sharma' },
  subjects: [{ id: 's1', name: 'Mathematics', progress: 82 }],
  tasks: [{ id: 't1', title: 'Physics assignment' }],
  schedule: [{ id: 'c1', title: 'Physics' }],
  activities: [{ id: 'a1', title: 'Football' }],
}));
vi.mock('../../services/api/apiClient', () => ({ apiRequest: vi.fn().mockResolvedValue(data) }));
function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ParentDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe('ParentDashboardPage', () => {
  it('renders linked child dashboard data and selector', async () => {
    renderPage();
    expect(await screen.findByText("Aarav Sharma's overview")).toBeInTheDocument();
    expect(screen.getByText('Mathematics · 82%')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Child' })).toBeInTheDocument();
  });
  it('supports changing the selected child', async () => {
    renderPage();
    const selector = await screen.findByRole('combobox', { name: 'Child' });
    fireEvent.change(selector, { target: { value: 'child-2' } });
    expect(selector).toHaveValue('child-2');
  });
});
