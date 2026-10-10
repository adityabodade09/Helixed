import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherDashboardPage } from './TeacherDashboardPage';
import { teacherDashboardApi, type TeacherDashboard } from './teacherDashboard.api';

vi.mock('./teacherDashboard.api', () => ({ teacherDashboardApi: { get: vi.fn() } }));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const dashboard: TeacherDashboard = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  summary: {
    assignedClasses: 1,
    authorizedStudents: 1,
    openStudentTasks: 3,
    attendanceSessionsPending: 1,
  },
  classes: [
    {
      id: 'class-1',
      name: 'Class 12',
      studentCount: 1,
      sessionSubjects: ['Mathematics'],
      openTaskCount: 3,
    },
  ],
  upcomingSessions: [
    {
      id: 'session-upcoming',
      classId: 'class-1',
      className: 'Class 12',
      subjectName: 'Mathematics',
      startsAt: '2026-10-02T10:00:00.000Z',
      endsAt: '2026-10-02T11:00:00.000Z',
      state: 'SCHEDULED',
      attendance: {
        expectedStudents: 1,
        knownRecords: 0,
        missingRecords: 1,
        absentRecords: 0,
      },
    },
  ],
  recentSessions: [
    {
      id: 'session-recent',
      classId: 'class-1',
      className: 'Class 12',
      subjectName: 'Physics',
      startsAt: '2026-10-01T10:00:00.000Z',
      endsAt: '2026-10-01T11:00:00.000Z',
      state: 'COMPLETED',
      attendance: {
        expectedStudents: 1,
        knownRecords: 0,
        missingRecords: 1,
        absentRecords: 0,
      },
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher']}>
        <TeacherDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherDashboardApi.get).mockResolvedValue(dashboard);
  });

  it('renders the assigned Teacher context and canonical operational information', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Teacher Dashboard' })).toBeInTheDocument();
    expect(screen.getAllByText('Neha Kapoor').length).toBeGreaterThan(0);
    expect(screen.getByText('Helixed Demo School')).toBeInTheDocument();
    expect(screen.getByText('Class 12')).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '3 open tasks',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('0 known · 1 missing · 0 absent')).toBeInTheDocument();
  });

  it('renders Teacher navigation without exposing private Student or Parent data', async () => {
    renderPage();
    expect(
      await screen.findByRole('navigation', { name: 'Teacher navigation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/teacher');
    expect(screen.getByRole('link', { name: /Classes/ })).toHaveAttribute(
      'href',
      '/teacher/classes',
    );
    expect(document.body.textContent).not.toMatch(
      /AI conversation|private message|parent relationship|teacher rating|effectiveness score/i,
    );
  });

  it('shows true sparse states when no active class assignment or sessions exist', async () => {
    vi.mocked(teacherDashboardApi.get).mockResolvedValue({
      ...dashboard,
      summary: {
        assignedClasses: 0,
        authorizedStudents: 0,
        openStudentTasks: 0,
        attendanceSessionsPending: 0,
      },
      classes: [],
      upcomingSessions: [],
      recentSessions: [],
    });
    renderPage();
    expect(
      await screen.findByText(
        'No active class assignments are available for this Teacher account.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('No upcoming official sessions recorded.')).toBeInTheDocument();
    expect(screen.getByText('No completed attendance sessions recorded.')).toBeInTheDocument();
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(teacherDashboardApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading Teacher dashboard…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherDashboardApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Teacher dashboard access is unavailable.')).toBeInTheDocument();
  });
});
