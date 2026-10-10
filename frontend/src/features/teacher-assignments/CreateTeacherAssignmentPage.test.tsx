import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { CreateTeacherAssignmentPage } from './CreateTeacherAssignmentPage';
import { teacherAssignmentsApi, type TeacherAssignments } from './teacherAssignments.api';

vi.mock('./teacherAssignments.api', () => ({
  teacherAssignmentsApi: { get: vi.fn(), create: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const options: TeacherAssignments = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [{ id: 'class-1', name: 'Class 12', subjects: ['Mathematics', 'Physics'] }],
  summary: { total: 0, active: 0, dueThisWeek: 0 },
  assignments: [],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={['/teacher/assignments/create']}>
        <Routes>
          <Route path="/teacher/assignments/create" element={<CreateTeacherAssignmentPage />} />
          <Route path="/teacher/assignments" element={<h1>Assignment list</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillRequiredFields() {
  fireEvent.change(await screen.findByLabelText('Assigned class'), {
    target: { value: 'class-1' },
  });
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Mathematics' } });
  fireEvent.change(screen.getByLabelText('Assignment title'), {
    target: { value: 'Fractions practice' },
  });
}

describe('CreateTeacherAssignmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherAssignmentsApi.get).mockResolvedValue(options);
    vi.mocked(teacherAssignmentsApi.create).mockResolvedValue({
      id: 'assignment-new',
      title: 'Fractions practice',
      class: { id: 'class-1', name: 'Class 12' },
      subjectName: 'Mathematics',
      dueAt: null,
      status: 'DRAFT',
      createdAt: '2026-10-02T08:00:00.000Z',
    });
  });

  it('renders only authorized class and subject options with Assignments active', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Create assignment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Assignments/ })).toHaveClass('text-blue-700');
    expect(await screen.findByRole('option', { name: 'Class 12' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Unassigned Class' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Assigned class'), { target: { value: 'class-1' } });
    expect(screen.getByRole('option', { name: 'Mathematics' })).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/student task|submission|grading|mark|student name/i),
    ).not.toBeInTheDocument();
  });

  it('validates locally, creates after backend confirmation, and returns to the list', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Create assignment' });
    fireEvent.click(await screen.findByRole('button', { name: 'Save draft' }));
    expect(screen.getByText(/Choose an assigned class and subject/)).toBeInTheDocument();
    expect(teacherAssignmentsApi.create).not.toHaveBeenCalled();

    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Instructions (optional)'), {
      target: { value: ' Complete questions 1–10. ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(teacherAssignmentsApi.create).toHaveBeenCalledWith('teacher-token', {
        classId: 'class-1',
        subjectName: 'Mathematics',
        title: 'Fractions practice',
        description: 'Complete questions 1–10.',
        status: 'DRAFT',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Assignment list' })).toBeInTheDocument();
  });

  it('prevents duplicate submission and never shows unconfirmed success', async () => {
    vi.mocked(teacherAssignmentsApi.create).mockReturnValue(new Promise<never>(() => {}));
    renderPage();
    await screen.findByRole('heading', { name: 'Create assignment' });
    await fillRequiredFields();
    const submit = screen.getByRole('button', { name: 'Save draft' });
    fireEvent.click(submit);
    expect(await screen.findByRole('button', { name: 'Creating assignment…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Creating assignment…' }));
    expect(teacherAssignmentsApi.create).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Assignment list' })).not.toBeInTheDocument();
  });

  it('renders unavailable, empty-class, and rejected-creation states without fake data', async () => {
    vi.mocked(teacherAssignmentsApi.get).mockRejectedValueOnce(new Error('forbidden'));
    const denied = renderPage();
    expect(await screen.findByText('Assignment creation is unavailable.')).toBeInTheDocument();
    denied.unmount();

    vi.mocked(teacherAssignmentsApi.get).mockResolvedValueOnce({ ...options, classes: [] });
    const empty = renderPage();
    expect(
      await screen.findByText('No assigned classes are available for assignment creation.'),
    ).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherAssignmentsApi.get).mockResolvedValueOnce(options);
    vi.mocked(teacherAssignmentsApi.create).mockRejectedValueOnce(new Error('forbidden'));
    renderPage();
    await screen.findByRole('heading', { name: 'Create assignment' });
    await fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText(/The assignment was not created/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Assignment list' })).not.toBeInTheDocument();
  });
});
