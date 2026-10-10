import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademyCoachesPage } from './AcademyCoachesPage';
import { academyCoachesApi, type AcademyCoachesResponse } from './academyCoaches.api';

vi.mock('./academyCoaches.api', () => ({ academyCoachesApi: { list: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'academy-token' }) }));

const response: AcademyCoachesResponse = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  summary: { coaches: 2 },
  coaches: [
    {
      id: 'coach-1',
      displayName: 'Neha Kapoor',
      joinedAt: '2026-01-01T00:00:00.000Z',
      batchCount: 2,
      batches: [
        { id: 'batch-1', name: 'Robotics Foundations' },
        { id: 'batch-2', name: 'Creative Computing' },
      ],
    },
    {
      id: 'coach-2',
      displayName: 'Asha Bose',
      joinedAt: '2026-02-01T00:00:00.000Z',
      batchCount: 0,
      batches: [],
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/academy/coaches']}>
        <AcademyCoachesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademyCoachesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academyCoachesApi.list).mockResolvedValue(response);
  });

  it('renders canonical Coach identity, batch context, and active navigation', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Neha Kapoor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Coaches/ })).toHaveClass('text-blue-700');
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/academy');
    expect(screen.getByRole('link', { name: /Students/ })).toHaveAttribute(
      'href',
      '/academy/students',
    );
    expect(screen.getByRole('link', { name: /Batches/ })).toHaveAttribute(
      'href',
      '/academy/batches',
    );
    const coach = document.querySelector('[data-coach-id="coach-1"]');
    expect(coach).toHaveTextContent('Robotics Foundations · Creative Computing');
    expect(coach).toHaveTextContent('2 batches');
    expect(screen.queryByRole('link', { name: 'Neha Kapoor' })).toBeNull();
  });

  it('renders zero-batch Coaches factually and supports scoped search/no-results', async () => {
    vi.mocked(academyCoachesApi.list).mockImplementation(async (_token, search) =>
      search === 'missing' ? { ...response, coaches: [] } : response,
    );
    renderPage();
    expect(await screen.findByText('No current batch assignment')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search coaches by name'), {
      target: { value: 'missing' },
    });
    expect(await screen.findByText('No coaches match this Academy search.')).toBeInTheDocument();
    expect(academyCoachesApi.list).toHaveBeenLastCalledWith('academy-token', 'missing');
  });

  it('renders an empty factual roster without management, analytics, or private fields', async () => {
    vi.mocked(academyCoachesApi.list).mockResolvedValue({
      ...response,
      summary: { coaches: 0 },
      coaches: [],
    });
    renderPage();
    expect(await screen.findByText('No current Academy Coaches are recorded.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /rating|performance|engagement|risk|ranking|recommendation|AI insight|email|phone/i,
    );
    expect(screen.queryByRole('button', { name: /invite|create|edit|delete|assign/i })).toBeNull();
  });

  it('renders loading and restricted/error states', async () => {
    vi.mocked(academyCoachesApi.list).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Academy coaches…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(academyCoachesApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy coaches are unavailable.')).toBeInTheDocument();
  });
});
