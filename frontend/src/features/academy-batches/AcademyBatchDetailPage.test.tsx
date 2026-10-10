import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademyBatchDetailPage } from './AcademyBatchesPage';
import { academyBatchesApi, type AcademyBatchDetailResponse } from './academyBatches.api';

vi.mock('./academyBatches.api', () => ({
  academyBatchesApi: { list: vi.fn(), detail: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'academy-token' }) }));

const response: AcademyBatchDetailResponse = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  batch: { id: 'batch-1', name: 'Robotics Foundations' },
  summary: { students: 1, coaches: 1 },
  students: [{ id: 'student-1', displayName: 'Aarav Sharma' }],
  coaches: [{ id: 'coach-1', displayName: 'Neha Kapoor' }],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/academy/batches/batch-1']}>
        <Routes>
          <Route path="/academy/batches/:id" element={<AcademyBatchDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademyBatchDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academyBatchesApi.detail).mockResolvedValue(response);
  });

  it('renders canonical batch members, matching counts, and active Batches navigation', async () => {
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Robotics Foundations' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Neha Kapoor')).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Batch member summary' });
    expect(within(summary).getAllByText('1', { selector: 'p' })).toHaveLength(2);
    expect(
      within(screen.getByRole('navigation', { name: 'Academy navigation' })).getByRole('link', {
        name: /Batches/,
      }),
    ).toHaveClass('text-blue-700');
    expect(screen.getByRole('link', { name: '← Back to Batches' })).toHaveAttribute(
      'href',
      '/academy/batches',
    );
    expect(academyBatchesApi.detail).toHaveBeenCalledWith('academy-token', 'batch-1');
  });

  it('renders factual empty member states without fabricating lifecycle or management', async () => {
    vi.mocked(academyBatchesApi.detail).mockResolvedValueOnce({
      ...response,
      summary: { students: 0, coaches: 0 },
      students: [],
      coaches: [],
    });
    renderPage();
    expect(
      await screen.findByText('No current Students are assigned to this batch.'),
    ).toBeInTheDocument();
    expect(screen.getByText('No current Coaches are assigned to this batch.')).toBeInTheDocument();
    expect(document.querySelector('main')?.textContent).not.toMatch(
      /active|inactive|schedule|session|program|capacity|performance|risk|ranking|AI insight/i,
    );
    expect(screen.queryByRole('button', { name: /add|edit|delete|assign|message/i })).toBeNull();
  });

  it('renders loading and non-revealing restricted/error states', async () => {
    vi.mocked(academyBatchesApi.detail).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Academy batch…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(academyBatchesApi.detail).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy batch is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Robotics Foundations')).not.toBeInTheDocument();
  });

  it('renders only minimized member identity without private or analytical UI', async () => {
    renderPage();
    await screen.findByText('Aarav Sharma');
    expect(document.querySelector('main')?.textContent).not.toMatch(
      /school|grade|mark|attendance|assignment|assessment|profile|parent|email|phone|credential|token|score|prediction|recommendation/i,
    );
  });
});
