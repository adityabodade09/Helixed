import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademyStudentsPage } from './AcademyStudentsPage';
import { academyStudentsApi, type AcademyStudentsResponse } from './academyStudents.api';

vi.mock('./academyStudents.api', () => ({ academyStudentsApi: { list: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'academy-token' }) }));

const response: AcademyStudentsResponse = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  batches: [{ id: 'batch-1', name: 'Robotics Foundations' }],
  students: [
    {
      id: 'student-1',
      displayName: 'Aarav Sharma',
      enrolledAt: '2026-01-01T00:00:00.000Z',
      batches: [{ id: 'batch-1', name: 'Robotics Foundations' }],
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/academy/students']}>
        <AcademyStudentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademyStudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academyStudentsApi.list).mockResolvedValue(response);
  });

  it('renders the authorized canonical roster, batch context, and active Students navigation', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Aarav Sharma' })).toBeInTheDocument();
    expect(screen.getAllByText('Robotics Foundations')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Students/ })).toHaveClass('text-blue-700');
    expect(document.querySelector('[data-student-id="student-1"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Aarav Sharma' })).toHaveAttribute(
      'href',
      '/academy/students/student-1',
    );
  });

  it('queries only supported name and batch filters and renders no results', async () => {
    vi.mocked(academyStudentsApi.list).mockImplementation(async (_token, filters) =>
      filters.search === 'Mira' ? { ...response, students: [] } : response,
    );
    renderPage();
    await screen.findByText('Aarav Sharma');
    fireEvent.change(screen.getByPlaceholderText('Search students by name'), {
      target: { value: 'Mira' },
    });
    expect(await screen.findByText('No students match these Academy filters.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by batch'), {
      target: { value: 'batch-1' },
    });
    await waitFor(() =>
      expect(academyStudentsApi.list).toHaveBeenLastCalledWith('academy-token', {
        search: 'Mira',
        batchId: 'batch-1',
      }),
    );
  });

  it('renders factual unassigned and empty roster states without private or profiling UI', async () => {
    vi.mocked(academyStudentsApi.list).mockResolvedValueOnce({
      ...response,
      students: [{ ...response.students[0], batches: [] }],
    });
    const unassigned = renderPage();
    expect(await screen.findByText('No batch assigned')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /grade|parent contact|school mark|attendance|engagement|potential|risk|rank|AI insight/i,
    );
    unassigned.unmount();

    vi.mocked(academyStudentsApi.list).mockResolvedValue({ ...response, students: [] });
    renderPage();
    expect(
      await screen.findByText('No active Academy enrollments are currently recorded.'),
    ).toBeInTheDocument();
  });

  it('renders loading and restricted/error states', async () => {
    vi.mocked(academyStudentsApi.list).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Academy students…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(academyStudentsApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy students are unavailable.')).toBeInTheDocument();
  });
});
