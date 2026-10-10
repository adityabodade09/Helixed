import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { teacherClassesApi, type TeacherClasses } from '../teacher-classes/teacherClasses.api';
import { TeacherClassSummaryPage } from './TeacherClassSummaryPage';
import { teacherClassSummaryApi, type TeacherClassSummary } from './teacherClassSummary.api';

vi.mock('../teacher-classes/teacherClasses.api', () => ({
  teacherClassesApi: { get: vi.fn() },
}));
vi.mock('./teacherClassSummary.api', () => ({
  teacherClassSummaryApi: { get: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const classes: TeacherClasses = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [
    {
      id: 'class-1',
      name: 'Class 12',
      subjects: ['Mathematics'],
      studentCount: 2,
      openTaskCount: 0,
      attendanceRecordingPending: 1,
      nextSession: null,
    },
    {
      id: 'class-2',
      name: 'Class 11',
      subjects: ['Physics'],
      studentCount: 1,
      openTaskCount: 0,
      attendanceRecordingPending: 0,
      nextSession: null,
    },
  ],
};

const summary: TeacherClassSummary = {
  teacher: classes.teacher,
  school: classes.school,
  class: { id: 'class-1', name: 'Class 12', studentCount: 2 },
  nextSession: {
    subjectName: 'Mathematics',
    startsAt: '2026-10-03T08:00:00.000Z',
    endsAt: '2026-10-03T09:00:00.000Z',
  },
  attendance: {
    completedSessions: 2,
    eligibleRecords: 4,
    knownRecords: 3,
    missingRecords: 1,
    present: 1,
    absent: 1,
    late: 1,
    partial: 0,
    presentRate: 33,
  },
  assignments: {
    total: 1,
    active: 1,
    dueSoon: 0,
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
  assessments: {
    total: 2,
    recordedMarks: 3,
    missingMarks: 1,
    normalizedAverage: 33,
    items: [
      {
        id: 'assessment-1',
        title: 'Unit Test',
        subjectName: 'Mathematics',
        maximumMarks: 100,
        assessedAt: '2026-09-20T08:00:00.000Z',
        recordedCount: 2,
        missingCount: 0,
        normalizedAverage: 25,
      },
      {
        id: 'assessment-2',
        title: 'Unrecorded Quiz',
        subjectName: 'Mathematics',
        maximumMarks: 50,
        assessedAt: '2026-09-25T08:00:00.000Z',
        recordedCount: 0,
        missingCount: 2,
        normalizedAverage: null,
      },
    ],
  },
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/class-summary']}>
        <TeacherClassSummaryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherClassSummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherClassesApi.get).mockResolvedValue(classes);
    vi.mocked(teacherClassSummaryApi.get).mockResolvedValue(summary);
  });

  it('renders canonical facts and keeps Class Summary navigation active', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Class Summary' })).toBeInTheDocument();
    const navigation = screen.getByRole('link', { name: /Class Summary/ });
    expect(navigation).toHaveAttribute('href', '/teacher/class-summary');
    expect(navigation.className).toContain('bg-blue-50');
    expect(await screen.findByText('Canonical assignment')).toBeInTheDocument();
    expect(screen.getByText('Unit Test')).toBeInTheDocument();
    expect(screen.getByText('Unrecorded Quiz')).toBeInTheDocument();
    expect(screen.getByText(/NOT RECORDED is excluded/)).toBeInTheDocument();
    expect(screen.getByText(/explicit recorded 0 remains/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /rank|leaderboard|potential score|intelligence|parent contact|submission count/i,
    );
  });

  it('queries only the selected authorized class', async () => {
    renderPage();
    await screen.findByText('Canonical assignment');
    expect(teacherClassSummaryApi.get).toHaveBeenCalledWith('teacher-token', 'class-1');
    fireEvent.change(screen.getByLabelText('Select assigned class'), {
      target: { value: 'class-2' },
    });
    await waitFor(() =>
      expect(teacherClassSummaryApi.get).toHaveBeenLastCalledWith('teacher-token', 'class-2'),
    );
  });

  it('renders sparse data as unavailable rather than fake zero evidence', async () => {
    vi.mocked(teacherClassSummaryApi.get).mockResolvedValue({
      ...summary,
      class: { ...summary.class, studentCount: 0 },
      nextSession: null,
      attendance: {
        completedSessions: 0,
        eligibleRecords: 0,
        knownRecords: 0,
        missingRecords: 0,
        present: 0,
        absent: 0,
        late: 0,
        partial: 0,
        presentRate: null,
      },
      assignments: { total: 0, active: 0, dueSoon: 0, items: [] },
      assessments: {
        total: 0,
        recordedMarks: 0,
        missingMarks: 0,
        normalizedAverage: null,
        items: [],
      },
    });
    renderPage();
    expect(await screen.findAllByText('Unavailable')).toHaveLength(2);
    expect(screen.getByText('No assignments are recorded for this class.')).toBeInTheDocument();
    expect(screen.getByText('No assessments are recorded for this class.')).toBeInTheDocument();
    expect(screen.getByText('No upcoming scheduled session is available.')).toBeInTheDocument();
  });

  it('renders loading, no-class, and restricted states', async () => {
    vi.mocked(teacherClassesApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading assigned classes…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherClassesApi.get).mockResolvedValue({ ...classes, classes: [] });
    const empty = renderPage();
    expect(
      await screen.findByText('No assigned classes are available to summarize.'),
    ).toBeInTheDocument();
    expect(teacherClassSummaryApi.get).not.toHaveBeenCalled();
    empty.unmount();

    vi.mocked(teacherClassesApi.get).mockResolvedValue(classes);
    vi.mocked(teacherClassSummaryApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(
      await screen.findByText('This class summary is restricted or unavailable.'),
    ).toBeInTheDocument();
  });
});
