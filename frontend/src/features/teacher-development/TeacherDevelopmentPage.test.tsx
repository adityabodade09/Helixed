import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherDevelopmentPage } from './TeacherDevelopmentPage';
import { teacherDevelopmentApi, type TeacherDevelopment } from './teacherDevelopment.api';

vi.mock('./teacherDevelopment.api', () => ({
  teacherDevelopmentApi: { get: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const development: TeacherDevelopment = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [
    {
      id: 'class-1',
      name: 'Class 12',
      students: [{ id: 'student-1', displayName: 'Aarav Sharma' }],
    },
    {
      id: 'class-2',
      name: 'Class 11',
      students: [{ id: 'student-2', displayName: 'Priya Demo' }],
    },
  ],
  selection: {
    class: { id: 'class-1', name: 'Class 12' },
    student: { id: 'student-1', displayName: 'Aarav Sharma' },
  },
  attendance: {
    known: 2,
    missing: 1,
    present: 1,
    absent: 1,
    late: 0,
    partial: 0,
    presentRate: 50,
    sessions: [
      {
        id: 'session-1',
        subjectName: 'Mathematics',
        startsAt: '2026-09-01T08:00:00Z',
        state: 'ABSENT',
      },
      {
        id: 'session-2',
        subjectName: 'Mathematics',
        startsAt: '2026-09-02T08:00:00Z',
        state: null,
      },
    ],
  },
  assessments: {
    recorded: 2,
    missing: 1,
    normalizedAverage: 25,
    items: [
      {
        id: 'assessment-1',
        title: 'Recorded zero',
        subjectName: 'Mathematics',
        maximumMarks: 100,
        assessedAt: '2026-09-01T08:00:00Z',
        mark: 0,
        normalizedPercent: 0,
      },
      {
        id: 'assessment-2',
        title: 'Missing result',
        subjectName: 'Mathematics',
        maximumMarks: 50,
        assessedAt: '2026-09-02T08:00:00Z',
        mark: null,
        normalizedPercent: null,
      },
    ],
  },
  classAssignments: {
    attribution: 'CLASS_CONTEXT_ONLY',
    items: [
      {
        id: 'assignment-1',
        title: 'Canonical assignment',
        subjectName: 'Mathematics',
        dueAt: null,
        status: 'OPEN',
      },
    ],
  },
  activityEvidence: { available: false },
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/development']}>
        <TeacherDevelopmentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherDevelopmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherDevelopmentApi.get).mockResolvedValue(development);
  });

  it('renders factual evidence and active Development navigation without profiling', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Development' })).toBeInTheDocument();
    const navigation = screen.getByRole('link', { name: /Development/ });
    expect(navigation).toHaveAttribute('href', '/teacher/development');
    expect(navigation.className).toContain('bg-blue-50');
    expect(await screen.findByRole('heading', { name: 'Aarav Sharma' })).toBeInTheDocument();
    expect(screen.getByText('Canonical assignment')).toBeInTheDocument();
    expect(
      screen.getByText(/No AI, ranking, profiling, or prediction is used/),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /intelligence score|potential score|risk score|leaderboard|top student|weak student|suggested focus/i,
    );
  });

  it('keeps recorded zero, missing Mark, and missing attendance visibly distinct', async () => {
    renderPage();
    const assessments = await screen.findByLabelText('Assessment evidence');
    expect(within(assessments).getByText('0/100 (0%)')).toBeInTheDocument();
    expect(within(assessments).getByText('NOT RECORDED')).toBeInTheDocument();
    const attendance = screen.getByLabelText('Attendance evidence');
    expect(within(attendance).getByText('ABSENT')).toBeInTheDocument();
    expect(within(attendance).getByText('NOT RECORDED')).toBeInTheDocument();
  });

  it('requerries the backend when the authorized class changes', async () => {
    vi.mocked(teacherDevelopmentApi.get).mockImplementation(async (_token, filters) =>
      filters?.classId === 'class-2'
        ? {
            ...development,
            selection: {
              class: { id: 'class-2', name: 'Class 11' },
              student: { id: 'student-2', displayName: 'Priya Demo' },
            },
          }
        : development,
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Aarav Sharma' });
    fireEvent.change(screen.getByLabelText('Select development class'), {
      target: { value: 'class-2' },
    });
    await waitFor(() =>
      expect(teacherDevelopmentApi.get).toHaveBeenCalledWith('teacher-token', {
        classId: 'class-2',
        studentId: undefined,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Priya Demo' })).toBeInTheDocument();
  });

  it('renders sparse evidence as unavailable rather than a negative judgment', async () => {
    vi.mocked(teacherDevelopmentApi.get).mockResolvedValue({
      ...development,
      attendance: {
        known: 0,
        missing: 0,
        present: 0,
        absent: 0,
        late: 0,
        partial: 0,
        presentRate: null,
        sessions: [],
      },
      assessments: { recorded: 0, missing: 0, normalizedAverage: null, items: [] },
      classAssignments: { attribution: 'CLASS_CONTEXT_ONLY', items: [] },
    });
    renderPage();
    expect(await screen.findAllByText('Unavailable')).toHaveLength(2);
    expect(screen.getByText('No completed attendance sessions are available.')).toBeInTheDocument();
    expect(
      screen.getByText('No assessment evidence is recorded for this student in this class.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No canonical Assignments are recorded for this class.'),
    ).toBeInTheDocument();
  });

  it('renders loading, empty-scope, empty-roster, and restricted states', async () => {
    vi.mocked(teacherDevelopmentApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading authorized development evidence…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherDevelopmentApi.get).mockResolvedValue({
      ...development,
      classes: [],
      selection: null,
    });
    const noClasses = renderPage();
    expect(
      await screen.findByText('No assigned classes are available for development evidence.'),
    ).toBeInTheDocument();
    noClasses.unmount();

    vi.mocked(teacherDevelopmentApi.get).mockResolvedValue({
      ...development,
      classes: [{ id: 'class-1', name: 'Class 12', students: [] }],
      selection: null,
    });
    const noStudents = renderPage();
    expect(
      await screen.findByText('No active students are available in this assigned class.'),
    ).toBeInTheDocument();
    noStudents.unmount();

    vi.mocked(teacherDevelopmentApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('Teacher development is restricted or unavailable.'),
    ).toBeInTheDocument();
  });
});
