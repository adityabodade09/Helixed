import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherStudentDetailPage } from './TeacherStudentsPage';
import { teacherStudentsApi, type TeacherStudentDetail } from './teacherStudents.api';

vi.mock('./teacherStudents.api', () => ({
  teacherStudentsApi: { get: vi.fn(), getDetail: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const detail: TeacherStudentDetail = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  student: { id: 'student-1', displayName: 'Aarav Sharma' },
  classes: [{ id: 'class-1', name: 'Class 12', subjects: ['Mathematics'] }],
  attendance: {
    summary: {
      scheduledSessions: 2,
      knownSessions: 1,
      missingSessions: 1,
      present: 1,
      absent: 0,
      late: 0,
      partial: 0,
      presentRate: 100,
    },
    sessions: [
      {
        id: 'session-2',
        classId: 'class-1',
        className: 'Class 12',
        subjectName: 'Mathematics',
        startsAt: '2026-09-09T08:00:00.000Z',
        endsAt: '2026-09-09T09:00:00.000Z',
        state: null,
      },
      {
        id: 'session-1',
        classId: 'class-1',
        className: 'Class 12',
        subjectName: 'Mathematics',
        startsAt: '2026-09-08T08:00:00.000Z',
        endsAt: '2026-09-08T09:00:00.000Z',
        state: 'PRESENT',
      },
    ],
  },
  tasks: { attributionAvailable: false, items: [] },
};

let navigate: NavigateFunction;

function NavigationCapture() {
  navigate = useNavigate();
  return null;
}

function renderDetail(studentId = 'student-1') {
  const result = render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/teacher/students/${studentId}`]}>
        <NavigationCapture />
        <Routes>
          <Route path="/teacher/students/:id" element={<TeacherStudentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, navigate: (path: string) => act(() => navigate(path)) };
}

describe('TeacherStudentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherStudentsApi.getDetail).mockResolvedValue(detail);
  });

  it('renders the authorized canonical student, class, attendance, and task boundary', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Aarav Sharma' })).toBeInTheDocument();
    expect(teacherStudentsApi.getDetail).toHaveBeenCalledWith('teacher-token', 'student-1');
    expect(screen.getByText('Class 12')).toBeInTheDocument();
    expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('NOT RECORDED')).toBeInTheDocument();
    expect(screen.getByText('PRESENT')).toBeInTheDocument();
    expect(screen.getByText(/tasks are not canonically linked to a class/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to students' })).toHaveAttribute(
      'href',
      '/teacher/students',
    );
    expect(screen.getByRole('link', { name: /Students/ })).toHaveClass(
      'bg-blue-50',
      'text-blue-700',
    );
    expect(document.body.textContent).not.toMatch(
      /intelligence|personality|potential score|risk score|ranking|parent|password|token|AI conversation/i,
    );
  });

  it('renders sparse attendance without treating missing evidence as absence', async () => {
    vi.mocked(teacherStudentsApi.getDetail).mockResolvedValue({
      ...detail,
      classes: [{ id: 'class-1', name: 'Class 12', subjects: [] }],
      attendance: {
        summary: {
          scheduledSessions: 0,
          knownSessions: 0,
          missingSessions: 0,
          present: 0,
          absent: 0,
          late: 0,
          partial: 0,
          presentRate: null,
        },
        sessions: [],
      },
    });
    renderDetail();
    expect(await screen.findByText('Not enough data')).toBeInTheDocument();
    expect(screen.getByText('No completed subject sessions')).toBeInTheDocument();
    expect(
      screen.getByText('No completed attendance sessions are available in this teaching context.'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ABSENT/);
  });

  it('renders loading and restricted states without private student detail', async () => {
    vi.mocked(teacherStudentsApi.getDetail).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderDetail();
    expect(screen.getByText('Loading student teaching context…')).toBeInTheDocument();
    expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherStudentsApi.getDetail).mockRejectedValue(new Error('forbidden'));
    renderDetail();
    expect(await screen.findByText('Student teaching context is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument();
  });

  it('clears the previous student while a changed resource request is pending', async () => {
    const { navigate: navigateTo } = renderDetail();
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    vi.mocked(teacherStudentsApi.getDetail).mockReturnValue(new Promise<never>(() => {}));
    navigateTo('/teacher/students/student-2');
    await waitFor(() =>
      expect(teacherStudentsApi.getDetail).toHaveBeenLastCalledWith('teacher-token', 'student-2'),
    );
    expect(screen.getByText('Loading student teaching context…')).toBeInTheDocument();
    expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument();
    expect(within(document.body).queryByText('Class 12')).not.toBeInTheDocument();
  });
});
