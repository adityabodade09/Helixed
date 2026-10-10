import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';
import { TeacherMarksPage } from './TeacherMarksPage';
import { teacherMarksApi, type TeacherMarkAssessment, type TeacherMarks } from './teacherMarks.api';

vi.mock('./teacherMarks.api', () => ({
  teacherMarksApi: { list: vi.fn(), detail: vi.fn(), record: vi.fn() },
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    accessToken: 'teacher-token',
    user: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  }),
}));

const marks: TeacherMarks = {
  teacher: { id: 'teacher-1', displayName: 'Neha Kapoor' },
  school: { id: 'school-1', name: 'Helixed Demo School' },
  classes: [{ id: 'class-1', name: 'Class 12' }],
  summary: { totalAssessments: 1, complete: 0, pendingEntry: 1 },
  assessments: [
    {
      id: 'assessment-1',
      title: 'Unit Test 1',
      class: { id: 'class-1', name: 'Class 12' },
      subjectName: 'Mathematics',
      maximumMarks: 100,
      assessedAt: '2026-09-05T08:00:00.000Z',
      rosterCount: 2,
      recordedCount: 1,
      missingCount: 1,
    },
  ],
};

const assessment: TeacherMarkAssessment = {
  id: 'assessment-1',
  title: 'Unit Test 1',
  class: { id: 'class-1', name: 'Class 12' },
  subjectName: 'Mathematics',
  maximumMarks: 100,
  assessedAt: '2026-09-05T08:00:00.000Z',
  roster: [
    {
      studentId: 'student-1',
      displayName: 'Aarav Sharma',
      mark: 84,
      currentMarkId: 'mark-1',
      recordedAt: '2026-09-06T08:00:00.000Z',
    },
    {
      studentId: 'student-2',
      displayName: 'Priya Demo',
      mark: null,
      currentMarkId: null,
      recordedAt: null,
    },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/teacher/marks']}>
        <TeacherMarksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherMarksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherMarksApi.list).mockResolvedValue(marks);
    vi.mocked(teacherMarksApi.detail).mockResolvedValue(assessment);
    vi.mocked(teacherMarksApi.record).mockResolvedValue(assessment);
  });

  it('renders authorized assessment data, roster states, and active Marks navigation', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Marks' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Marks/ })).toHaveAttribute('href', '/teacher/marks');
    expect(await screen.findByText('Unit Test 1')).toBeInTheDocument();
    const roster = await screen.findByLabelText('Authorized marks roster');
    expect(within(roster).getByLabelText('Recorded mark for Aarav Sharma: 84')).toBeInTheDocument();
    expect(
      within(roster).getByLabelText('Recorded mark for Priya Demo: NOT RECORDED'),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /rank|percentile|intelligence|parent contact|password|token|community|private profile/i,
    );
  });

  it('applies server-side search and exact assigned-class filters', async () => {
    renderPage();
    await screen.findByText('Unit Test 1');
    fireEvent.change(screen.getByLabelText('Search assessments'), { target: { value: 'unit' } });
    fireEvent.change(await screen.findByLabelText('Filter marks by assigned class'), {
      target: { value: 'class-1' },
    });
    await waitFor(() =>
      expect(teacherMarksApi.list).toHaveBeenLastCalledWith('teacher-token', {
        classId: 'class-1',
        search: 'unit',
      }),
    );
  });

  it('records explicit valid marks only after backend confirmation', async () => {
    const saved: TeacherMarkAssessment = {
      ...assessment,
      roster: assessment.roster.map((student) =>
        student.studentId === 'student-2'
          ? { ...student, mark: 0, currentMarkId: 'mark-2', recordedAt: '2026-10-02T08:00:00Z' }
          : student,
      ),
    };
    vi.mocked(teacherMarksApi.record).mockResolvedValue(saved);
    renderPage();
    await screen.findByText('Priya Demo');
    fireEvent.change(screen.getByLabelText('Mark for Priya Demo'), { target: { value: '0' } });
    const save = screen.getByRole('button', { name: 'Save official marks' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() =>
      expect(teacherMarksApi.record).toHaveBeenCalledWith('teacher-token', 'assessment-1', [
        { studentId: 'student-2', value: 0, expectedMarkId: null },
      ]),
    );
    expect(await screen.findByText('Official marks saved.')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Authorized marks roster')).getByLabelText(
        'Recorded mark for Priya Demo: 0',
      ),
    ).toBeInTheDocument();
  });

  it('blocks invalid values and reconciles failed or stale writes', async () => {
    vi.mocked(teacherMarksApi.record).mockRejectedValue(new Error('conflict'));
    vi.mocked(teacherMarksApi.detail)
      .mockResolvedValueOnce(assessment)
      .mockResolvedValueOnce(assessment);
    renderPage();
    await screen.findByText('Priya Demo');
    fireEvent.change(screen.getByLabelText('Mark for Priya Demo'), { target: { value: '101' } });
    expect(screen.getByText('Enter a whole-number mark between 0 and 100.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save official marks' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mark for Priya Demo'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save official marks' }));
    expect(
      await screen.findByText(
        'Marks were not saved. The authoritative records have been refreshed.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(teacherMarksApi.detail).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Mark for Priya Demo')).toHaveValue(null);
  });

  it('renders loading, empty, no-results, and restricted states', async () => {
    vi.mocked(teacherMarksApi.list).mockReturnValue(new Promise<never>(() => {}));
    const loading = renderPage();
    expect(screen.getByText('Loading authorized assessments…')).toBeInTheDocument();
    loading.unmount();

    vi.mocked(teacherMarksApi.list).mockResolvedValue({
      ...marks,
      summary: { totalAssessments: 0, complete: 0, pendingEntry: 0 },
      assessments: [],
    });
    const empty = renderPage();
    expect(
      await screen.findByText('No assessments are available for your assigned classes.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search assessments'), { target: { value: 'missing' } });
    expect(
      await screen.findByText('No authorized assessments match these filters.'),
    ).toBeInTheDocument();
    empty.unmount();

    vi.mocked(teacherMarksApi.list).mockRejectedValue(new Error('forbidden'));
    renderPage();
    expect(await screen.findByText('Teacher marks are unavailable.')).toBeInTheDocument();
  });
});
