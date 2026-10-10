import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademyBatchesPage } from './AcademyBatchesPage';
import { academyBatchesApi, type AcademyBatchesResponse } from './academyBatches.api';

vi.mock('./academyBatches.api', () => ({ academyBatchesApi: { list: vi.fn(), detail: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'academy-token' }) }));

const response: AcademyBatchesResponse = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  summary: { batches: 1, enrolledStudents: 1, assignedCoaches: 1 },
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
      <MemoryRouter initialEntries={['/academy/batches']}>
        <AcademyBatchesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademyBatchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academyBatchesApi.list).mockResolvedValue(response);
  });

  it('renders canonical batches, factual counts, and active Academy navigation', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Robotics Foundations' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Batches/ })).toHaveClass('text-blue-700');
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/academy');
    expect(screen.getByRole('link', { name: /Students/ })).toHaveAttribute(
      'href',
      '/academy/students',
    );
    const batch = document.querySelector('[data-batch-id="batch-1"]');
    expect(batch).not.toBeNull();
    expect(batch).toHaveTextContent('1 Students');
    expect(batch).toHaveTextContent('1 Coaches');
    expect(screen.getByRole('link', { name: 'Robotics Foundations' })).toHaveAttribute(
      'href',
      '/academy/batches/batch-1',
    );
  });

  it('searches by supported batch name and renders no-results state', async () => {
    vi.mocked(academyBatchesApi.list).mockImplementation(async (_token, search) =>
      search === 'missing' ? { ...response, batches: [] } : response,
    );
    renderPage();
    await screen.findByText('Robotics Foundations');
    fireEvent.change(screen.getByPlaceholderText('Search batches by name'), {
      target: { value: 'missing' },
    });
    expect(await screen.findByText('No batches match this Academy search.')).toBeInTheDocument();
    expect(academyBatchesApi.list).toHaveBeenLastCalledWith('academy-token', 'missing');
  });

  it('renders factual empty state without lifecycle, analytics, or mutation controls', async () => {
    vi.mocked(academyBatchesApi.list).mockResolvedValue({
      ...response,
      summary: { batches: 0, enrolledStudents: 0, assignedCoaches: 0 },
      batches: [],
    });
    renderPage();
    expect(
      await screen.findByText('No Academy batches are currently recorded.'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /active batch|inactive batch|schedule|next session|performance|engagement|risk|ranking|AI insight/i,
    );
    expect(screen.queryByRole('button', { name: /create|import|delete|assign/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Robotics Foundations/ })).toBeNull();
  });

  it('renders loading and restricted/error states', async () => {
    vi.mocked(academyBatchesApi.list).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Academy batches…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(academyBatchesApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy batches are unavailable.')).toBeInTheDocument();
  });
});
