import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademyDashboardPage } from './AcademyDashboardPage';
import { academyDashboardApi, type AcademyDashboard } from './academyDashboard.api';

vi.mock('./academyDashboard.api', () => ({ academyDashboardApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ accessToken: 'academy-token' }),
}));

const dashboard: AcademyDashboard = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  summary: { enrolledStudents: 1, batches: 1, assignedCoaches: 1 },
  batches: [
    {
      id: 'batch-1',
      name: 'Robotics Foundations',
      studentCount: 1,
      coachCount: 1,
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/academy']}>
        <AcademyDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademyDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academyDashboardApi.get).mockResolvedValue(dashboard);
  });

  it('renders the Academy shell and supported canonical dashboard facts', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Helixed Skills Academy' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Academy navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveClass('text-blue-700');
    expect(screen.getByText('Robotics Foundations')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3);
  });

  it('keeps future Academy modules unavailable and omits unsupported private analytics', async () => {
    renderPage();
    await screen.findByText('Robotics Foundations');
    expect(screen.getByRole('link', { name: /Students/ })).toHaveAttribute(
      'href',
      '/academy/students',
    );
    expect(screen.getByRole('link', { name: /Batches/ })).toHaveAttribute(
      'href',
      '/academy/batches',
    );
    expect(screen.getByRole('link', { name: /Coaches/ })).toHaveAttribute(
      'href',
      '/academy/coaches',
    );
    expect(screen.queryByRole('link', { name: /Certificates|Messages/ })).toBeNull();
    for (const unsupported of [
      /academy health/i,
      /engagement score/i,
      /student potential/i,
      /ranking/i,
      /AI insight/i,
    ])
      expect(screen.queryByRole('heading', { name: unsupported })).toBeNull();
  });

  it('renders truthful sparse and empty states', async () => {
    vi.mocked(academyDashboardApi.get).mockResolvedValue({
      ...dashboard,
      summary: { enrolledStudents: 0, batches: 0, assignedCoaches: 0 },
      batches: [],
    });
    renderPage();
    expect(
      await screen.findByText('No Academy batches are currently recorded.'),
    ).toBeInTheDocument();
  });

  it('renders loading and restricted/error states', async () => {
    vi.mocked(academyDashboardApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Academy dashboard…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(academyDashboardApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy dashboard access is unavailable.')).toBeInTheDocument();
  });
});
