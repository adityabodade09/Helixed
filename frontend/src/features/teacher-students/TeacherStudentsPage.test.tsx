import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherStudentsPage } from './TeacherStudentsPage';
import { teacherStudentsApi, type TeacherStudents } from './teacherStudents.api';

vi.mock('./teacherStudents.api', () => ({ teacherStudentsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const roster: TeacherStudents = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [{ id: 'class-1', name: 'Class 12' }],
  students: [
    {
      id: 'student-1',
      displayName: 'Aarav Sharma',
      classes: [{ id: 'class-1', name: 'Class 12', subjects: ['Mathematics'] }],
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/students']}>
        <TeacherStudentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherStudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherStudentsApi.get).mockResolvedValue(roster);
  });

  it('renders the authorized roster and active Students navigation without private student data', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'My Students' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Students/ })).toHaveAttribute(
      'href',
      '/teacher/students',
    );
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    const rosterList = screen.getByLabelText('Authorized students');
    expect(within(rosterList).getByText('Class 12')).toBeInTheDocument();
    expect(within(rosterList).getByText(/Mathematics/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Aarav Sharma' })).toHaveAttribute(
      'href',
      '/teacher/students/student-1',
    );
    expect(document.body.textContent).not.toMatch(
      /Mira|password|token|AI conversation|parent relationship/i,
    );
  });

  it('uses authorized search and class-filter query parameters', async () => {
    renderPage();
    const search = await screen.findByRole('textbox', { name: 'Search authorized students' });
    fireEvent.change(search, { target: { value: 'aarav' } });
    await waitFor(() =>
      expect(teacherStudentsApi.get).toHaveBeenLastCalledWith('teacher-token', {
        search: 'aarav',
        classId: undefined,
      }),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by assigned class' }), {
      target: { value: 'class-1' },
    });
    await waitFor(() =>
      expect(teacherStudentsApi.get).toHaveBeenLastCalledWith('teacher-token', {
        search: 'aarav',
        classId: 'class-1',
      }),
    );
  });

  it('renders search-empty, roster-empty, loading, and restricted states', async () => {
    vi.mocked(teacherStudentsApi.get).mockResolvedValue({ ...roster, students: [] });
    const empty = renderPage();
    expect(
      await screen.findByText('No active students are available in your assigned classes.'),
    ).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherStudentsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading authorized students…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherStudentsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Teacher students are unavailable.')).toBeInTheDocument();
  });
});
