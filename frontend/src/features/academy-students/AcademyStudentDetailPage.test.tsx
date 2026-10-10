import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { AcademyStudentDetailPage } from './AcademyStudentsPage';
import { academyStudentsApi, type AcademyStudentDetailResponse } from './academyStudents.api';

vi.mock('./academyStudents.api', () => ({
  academyStudentsApi: { list: vi.fn(), detail: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ accessToken: 'academy-token' }) }));

const response: AcademyStudentDetailResponse = {
  academy: { id: 'academy-1', name: 'Helixed Skills Academy' },
  student: {
    id: 'student-1',
    displayName: 'Aarav Sharma',
    enrolledAt: '2026-01-01T00:00:00.000Z',
    batches: [{ id: 'batch-1', name: 'Robotics Foundations' }],
  },
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/academy/students/student-1']}>
        <Routes>
          <Route path="/academy/students/:id" element={<AcademyStudentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcademyStudentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(academyStudentsApi.detail).mockResolvedValue(response);
  });

  it('renders canonical Academy enrollment facts with active Students navigation and back link', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Aarav Sharma' })).toBeInTheDocument();
    expect(screen.getByText('Robotics Foundations')).toBeInTheDocument();
    expect(screen.getByText(/Enrolled/)).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Academy navigation' })).getByRole('link', {
        name: /Students/,
      }),
    ).toHaveClass('text-blue-700');
    expect(screen.getByRole('link', { name: '← Back to Students' })).toHaveAttribute(
      'href',
      '/academy/students',
    );
    expect(academyStudentsApi.detail).toHaveBeenCalledWith('academy-token', 'student-1');
  });

  it('renders a factual sparse no-batch state without private, School, or profiling UI', async () => {
    vi.mocked(academyStudentsApi.detail).mockResolvedValueOnce({
      ...response,
      student: { ...response.student, batches: [] },
    });
    renderPage();
    expect(await screen.findByText('No batch assigned.')).toBeInTheDocument();
    expect(document.querySelector('main')?.textContent).not.toMatch(
      /grade|school|parent|email|phone|mark|attendance|assignment|profile|coach note|certificate|opportunity|risk|score|rank|AI insight/i,
    );
  });

  it('renders loading and non-revealing restricted/error states', async () => {
    vi.mocked(academyStudentsApi.detail).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Academy student…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(academyStudentsApi.detail).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Academy student is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument();
  });
});
