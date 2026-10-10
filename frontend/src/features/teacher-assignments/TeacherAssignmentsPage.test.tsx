import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherAssignmentsPage } from './TeacherAssignmentsPage';
import { teacherAssignmentsApi, type TeacherAssignments } from './teacherAssignments.api';

vi.mock('./teacherAssignments.api', () => ({ teacherAssignmentsApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const assignments: TeacherAssignments = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [{ id: 'class-1', name: 'Class 12', subjects: ['Mathematics', 'Physics'] }],
  summary: { total: 2, active: 1, dueThisWeek: 1 },
  assignments: [
    {
      id: 'assignment-1',
      title: 'Linear Equations Worksheet',
      class: { id: 'class-1', name: 'Class 12' },
      subjectName: 'Mathematics',
      dueAt: '2026-10-05T12:00:00.000Z',
      status: 'OPEN',
      createdAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 'assignment-2',
      title: 'Energy Project Brief',
      class: { id: 'class-1', name: 'Class 12' },
      subjectName: 'Physics',
      dueAt: null,
      status: 'DRAFT',
      createdAt: '2026-10-01T09:00:00.000Z',
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/assignments']}>
        <TeacherAssignmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherAssignmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherAssignmentsApi.get).mockResolvedValue(assignments);
  });

  it('renders the authorized canonical list and keeps Assignments navigation active', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Assignments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Assignments/ })).toHaveAttribute(
      'href',
      '/teacher/assignments',
    );
    expect(await screen.findByText('Linear Equations Worksheet')).toBeInTheDocument();
    expect(screen.getByText('Energy Project Brief')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Create Assignment' })).toHaveAttribute(
      'href',
      '/teacher/assignments/create',
    );
    expect(
      screen.getByText('Canonical submissions and grading are not implemented.'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /student name|password|token|community|private profile|parent contact|average mark/i,
    );
  });

  it('issues child-safe server-side search, class, and status filters', async () => {
    renderPage();
    await screen.findByText('Linear Equations Worksheet');
    fireEvent.change(screen.getByLabelText('Search assignments'), { target: { value: 'linear' } });
    fireEvent.change(screen.getByLabelText('Assigned class'), { target: { value: 'class-1' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'OPEN' } });
    await waitFor(() =>
      expect(teacherAssignmentsApi.get).toHaveBeenLastCalledWith('teacher-token', {
        search: 'linear',
        classId: 'class-1',
        status: 'OPEN',
      }),
    );
  });

  it('renders loading and restricted states', async () => {
    vi.mocked(teacherAssignmentsApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading authorized assignments…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherAssignmentsApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Teacher assignments are unavailable.')).toBeInTheDocument();
  });

  it('distinguishes an empty roster from filtered no results', async () => {
    vi.mocked(teacherAssignmentsApi.get).mockResolvedValue({
      ...assignments,
      summary: { total: 0, active: 0, dueThisWeek: 0 },
      assignments: [],
    });
    renderPage();
    expect(
      await screen.findByText('No assignments are available for your assigned classes.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search assignments'), { target: { value: 'missing' } });
    expect(
      await screen.findByText('No authorized assignments match these filters.'),
    ).toBeInTheDocument();
  });
});
