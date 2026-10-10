import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherClassDetailPage, TeacherClassesPage } from './TeacherClassesPage';
import {
  teacherClassesApi,
  type TeacherClassDetail,
  type TeacherClasses,
} from './teacherClasses.api';

vi.mock('./teacherClasses.api', () => ({
  teacherClassesApi: { get: vi.fn(), getDetail: vi.fn() },
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
      openTaskCount: 3,
      attendanceRecordingPending: 1,
      nextSession: {
        subjectName: 'Mathematics',
        startsAt: '2026-10-02T10:00:00.000Z',
        endsAt: '2026-10-02T11:00:00.000Z',
      },
    },
  ],
};

const detail: TeacherClassDetail = {
  ...classes.classes[0],
  school: classes.school,
  recentSessions: [
    {
      id: 'session-1',
      subjectName: 'Mathematics',
      startsAt: '2026-10-01T10:00:00.000Z',
      endsAt: '2026-10-01T11:00:00.000Z',
      state: 'COMPLETED',
      knownAttendanceCount: 1,
      missingAttendanceCount: 1,
      absentAttendanceCount: 0,
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/classes']}>
        <TeacherClassesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderDetail(path = '/teacher/classes/class-1') {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/teacher/classes/:id" element={<TeacherClassDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherClassesApi.get).mockResolvedValue(classes);
    vi.mocked(teacherClassesApi.getDetail).mockResolvedValue(detail);
  });

  it('renders only assigned canonical class summaries and active Classes navigation', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'My Classes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Classes/ })).toHaveAttribute(
      'href',
      '/teacher/classes',
    );
    expect(await screen.findByRole('heading', { name: 'Class 12' })).toBeInTheDocument();
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/completed session is missing/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open class/i })).toHaveAttribute(
      'href',
      '/teacher/classes/class-1',
    );
    expect(document.body.textContent).not.toMatch(
      /Aarav|Mira|AI conversation|private message|parent relationship|rating/i,
    );
  });

  it('renders the authorized class detail with factual operational summaries', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Class 12' })).toBeInTheDocument();
    expect(screen.getByText('Helixed Demo School')).toBeInTheDocument();
    expect(screen.getByText('1 known records')).toBeInTheDocument();
    expect(screen.getByText(/1 unavailable · 0 recorded absent/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to classes/i })).toHaveAttribute(
      'href',
      '/teacher/classes',
    );
    expect(document.body.textContent).not.toMatch(
      /Aarav|Mira|AI conversation|password|token|parent/i,
    );
  });

  it('renders sparse, loading, and restricted class-detail states without stale class data', async () => {
    vi.mocked(teacherClassesApi.getDetail).mockResolvedValue({ ...detail, recentSessions: [] });
    const sparse = renderDetail();
    expect(
      await screen.findByText('No official sessions are recorded for this class.'),
    ).toBeInTheDocument();
    sparse.unmount();

    vi.mocked(teacherClassesApi.getDetail).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderDetail();
    expect(screen.getByText('Loading class details…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherClassesApi.getDetail).mockRejectedValue(new Error('forbidden'));
    renderDetail('/teacher/classes/class-2');
    expect(await screen.findByText('Class access is unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Class 12' })).not.toBeInTheDocument();
  });

  it('sends class search to the canonical backend query', async () => {
    renderPage();
    const search = await screen.findByRole('textbox', { name: 'Search assigned classes' });
    fireEvent.change(search, { target: { value: 'mathematics' } });
    await waitFor(() =>
      expect(teacherClassesApi.get).toHaveBeenLastCalledWith('teacher-token', 'mathematics'),
    );
  });

  it('shows the no-assignment state without a school-wide fallback', async () => {
    vi.mocked(teacherClassesApi.get).mockResolvedValue({ ...classes, classes: [] });
    renderPage();
    expect(
      await screen.findByText(
        'No active class assignments are available for this Teacher account.',
      ),
    ).toBeInTheDocument();
  });

  it('shows loading and restricted states', async () => {
    vi.mocked(teacherClassesApi.get).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading assigned classes…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherClassesApi.get).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Teacher classes are unavailable.')).toBeInTheDocument();
  });
});
