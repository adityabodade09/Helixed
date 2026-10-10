import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherAttendancePage } from './TeacherAttendancePage';
import {
  teacherAttendanceApi,
  type TeacherAttendance,
  type TeacherAttendanceSession,
} from './teacherAttendance.api';

vi.mock('./teacherAttendance.api', () => ({
  teacherAttendanceApi: { list: vi.fn(), detail: vi.fn(), record: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const completedId = '30000000-0000-4000-8000-000000000001';
const scheduledId = '30000000-0000-4000-8000-000000000002';
const firstStudentId = '10000000-0000-4000-8000-000000000001';
const secondStudentId = '10000000-0000-4000-8000-000000000002';

const attendance: TeacherAttendance = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [{ id: 'class-1', name: 'Class 12' }],
  sessions: [
    {
      id: completedId,
      classId: 'class-1',
      className: 'Class 12',
      subjectName: 'Mathematics',
      startsAt: '2026-09-01T08:00:00.000Z',
      endsAt: '2026-09-01T08:45:00.000Z',
      state: 'COMPLETED',
      rosterCount: 2,
      recordedCount: 1,
      missingCount: 1,
      absentCount: 0,
      recordingStatus: 'PARTIAL',
    },
    {
      id: scheduledId,
      classId: 'class-1',
      className: 'Class 12',
      subjectName: 'Physics',
      startsAt: '2026-09-02T08:00:00.000Z',
      endsAt: '2026-09-02T08:45:00.000Z',
      state: 'SCHEDULED',
      rosterCount: 2,
      recordedCount: 0,
      missingCount: 2,
      absentCount: 0,
      recordingStatus: 'NOT_STARTED',
    },
  ],
};

function session(
  id = completedId,
  state: TeacherAttendanceSession['state'] = 'COMPLETED',
): TeacherAttendanceSession {
  return {
    id,
    class: { id: 'class-1', name: 'Class 12' },
    subjectName: id === scheduledId ? 'Physics' : 'Mathematics',
    startsAt: '2026-09-01T08:00:00.000Z',
    endsAt: '2026-09-01T08:45:00.000Z',
    state,
    canRecord: state === 'COMPLETED',
    roster: [
      {
        studentId: firstStudentId,
        displayName: 'Aarav Sharma',
        status: 'PRESENT',
        currentRecordId: '40000000-0000-4000-8000-000000000001',
        recordedAt: '2026-09-01T09:00:00.000Z',
      },
      {
        studentId: secondStudentId,
        displayName: 'Priya Demo',
        status: null,
        currentRecordId: null,
        recordedAt: null,
      },
    ],
  };
}

function renderPage() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={['/teacher/attendance']}>
        <TeacherAttendancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherAttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherAttendanceApi.list).mockResolvedValue(attendance);
    vi.mocked(teacherAttendanceApi.detail).mockImplementation(async (_token, id) =>
      id === scheduledId ? session(scheduledId, 'SCHEDULED') : session(),
    );
    vi.mocked(teacherAttendanceApi.record).mockResolvedValue(session());
  });

  it('renders assigned sessions, active navigation, roster, and a distinct not-recorded state', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Attendance/ })).toHaveAttribute(
      'href',
      '/teacher/attendance',
    );
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    const roster = screen.getByLabelText('Authorized attendance roster');
    expect(
      within(roster).getByLabelText('Recorded status for Aarav Sharma: PRESENT'),
    ).toBeInTheDocument();
    expect(
      within(roster).getByLabelText('Recorded status for Priya Demo: NOT RECORDED'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /password|token|AI conversation|community message|parent relationship|private profile/i,
    );
  });

  it('selects a scheduled session and keeps its roster read-only', async () => {
    renderPage();
    await screen.findByText('Aarav Sharma');
    fireEvent.click(screen.getByRole('button', { name: /Class 12 Physics/ }));
    expect(
      await screen.findByText('Recording is available only for completed sessions.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Attendance for Aarav Sharma' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Save official attendance' }),
    ).not.toBeInTheDocument();
  });

  it('sends only explicit changes with current-record expectations and trusts backend confirmation', async () => {
    const confirmed = session();
    confirmed.roster = [
      { ...confirmed.roster[0], status: 'LATE', currentRecordId: 'new-record-1' },
      {
        ...confirmed.roster[1],
        status: 'ABSENT',
        currentRecordId: 'new-record-2',
        recordedAt: '2026-09-01T09:05:00.000Z',
      },
    ];
    vi.mocked(teacherAttendanceApi.record).mockResolvedValue(confirmed);
    renderPage();
    await screen.findByText('Aarav Sharma');
    fireEvent.change(screen.getByRole('combobox', { name: 'Attendance for Aarav Sharma' }), {
      target: { value: 'LATE' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Attendance for Priya Demo' }), {
      target: { value: 'ABSENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save official attendance' }));
    expect(await screen.findByText('Official attendance saved.')).toBeInTheDocument();
    expect(teacherAttendanceApi.record).toHaveBeenCalledWith('teacher-token', completedId, [
      {
        studentId: firstStudentId,
        state: 'LATE',
        expectedRecordId: '40000000-0000-4000-8000-000000000001',
      },
      { studentId: secondStudentId, state: 'ABSENT', expectedRecordId: null },
    ]);
    const roster = screen.getByLabelText('Authorized attendance roster');
    expect(
      within(roster).getByLabelText('Recorded status for Aarav Sharma: LATE'),
    ).toBeInTheDocument();
    expect(
      within(roster).getByLabelText('Recorded status for Priya Demo: ABSENT'),
    ).toBeInTheDocument();
  });

  it('shows saving state and reconciles a stale write to the authoritative server state', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    vi.mocked(teacherAttendanceApi.record).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectWrite = reject;
      }),
    );
    vi.mocked(teacherAttendanceApi.detail)
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(session());
    renderPage();
    await screen.findByText('Aarav Sharma');
    fireEvent.change(screen.getByRole('combobox', { name: 'Attendance for Aarav Sharma' }), {
      target: { value: 'ABSENT' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save official attendance' }));
    expect(
      await screen.findByRole('button', { name: 'Saving official attendance…' }),
    ).toBeDisabled();
    rejectWrite(new Error('conflict'));
    expect(
      await screen.findByText(
        'Attendance was not saved. The authoritative record has been refreshed.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(teacherAttendanceApi.detail).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Authorized attendance roster')).getByLabelText(
          'Recorded status for Aarav Sharma: PRESENT',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('renders loading, empty, and restricted states without fabricated sessions', async () => {
    vi.mocked(teacherAttendanceApi.list).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading assigned attendance sessions…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherAttendanceApi.list).mockResolvedValue({ ...attendance, sessions: [] });
    const empty = renderPage();
    expect(
      await screen.findByText('No attendance sessions are available for these filters.'),
    ).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherAttendanceApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Teacher attendance is unavailable.')).toBeInTheDocument();
  });
});
