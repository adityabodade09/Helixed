import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherMarksApi, type TeacherMarkAssessment } from './teacherMarks.api';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function markDraft(assessment: TeacherMarkAssessment) {
  return Object.fromEntries(
    assessment.roster.map(({ studentId, mark }) => [studentId, mark === null ? '' : String(mark)]),
  );
}

export function TeacherMarksPage() {
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['teacher-marks', classId, search],
    queryFn: () =>
      teacherMarksApi.list(accessToken!, {
        classId: classId || undefined,
        search: search.trim() || undefined,
      }),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    const assessments = listQuery.data?.assessments;
    if (!assessments) return;
    setSelectedAssessmentId((current) =>
      current && assessments.some(({ id }) => id === current)
        ? current
        : (assessments[0]?.id ?? null),
    );
  }, [listQuery.data]);

  const detailQuery = useQuery({
    queryKey: ['teacher-mark-assessment', selectedAssessmentId],
    queryFn: () => teacherMarksApi.detail(accessToken!, selectedAssessmentId!),
    enabled: Boolean(accessToken && selectedAssessmentId),
  });

  useEffect(() => {
    setDraft(detailQuery.data ? markDraft(detailQuery.data) : {});
  }, [detailQuery.data]);

  const changes = useMemo(() => {
    if (!detailQuery.data) return [];
    return detailQuery.data.roster.flatMap((student) => {
      const raw = draft[student.studentId]?.trim() ?? '';
      if (!raw) return [];
      const value = Number(raw);
      return Number.isInteger(value) &&
        value >= 0 &&
        value <= detailQuery.data.maximumMarks &&
        value !== student.mark
        ? [{ studentId: student.studentId, value, expectedMarkId: student.currentMarkId }]
        : [];
    });
  }, [detailQuery.data, draft]);

  const hasInvalidValue = Boolean(
    detailQuery.data?.roster.some((student) => {
      const raw = draft[student.studentId]?.trim() ?? '';
      if (!raw) return false;
      const value = Number(raw);
      return !Number.isInteger(value) || value < 0 || value > detailQuery.data!.maximumMarks;
    }),
  );

  const save = useMutation({
    mutationFn: () => teacherMarksApi.record(accessToken!, selectedAssessmentId!, changes),
    onMutate: () => setNotice(null),
    onSuccess: (assessment) => {
      queryClient.setQueryData(['teacher-mark-assessment', assessment.id], assessment);
      setDraft(markDraft(assessment));
      void queryClient.invalidateQueries({ queryKey: ['teacher-marks'] });
      setNotice('Official marks saved.');
    },
    onError: async () => {
      setNotice('Marks were not saved. The authoritative records have been refreshed.');
      const refreshed = await detailQuery.refetch();
      if (refreshed.data) setDraft(markDraft(refreshed.data));
    },
  });

  const teacherName = listQuery.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-7xl space-y-5 px-5 py-7 lg:px-8">
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Academic records
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-helixed-navy">Marks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record and review assessment results for your authorized classes.
          </p>
        </section>

        {listQuery.isLoading ? (
          <StateCard text="Loading authorized assessments…" />
        ) : listQuery.isError || !listQuery.data ? (
          <StateCard text="Teacher marks are unavailable." tone="error" />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Total assessments"
                value={listQuery.data.summary.totalAssessments}
              />
              <SummaryCard
                label="Marks complete"
                value={listQuery.data.summary.complete}
                tone="green"
              />
              <SummaryCard
                label="Pending entry"
                value={listQuery.data.summary.pendingEntry}
                tone="amber"
              />
            </section>

            <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr]">
              <label className="text-xs font-bold text-slate-600">
                Search assessments
                <input
                  aria-label="Search assessments"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Title or subject"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Assigned class
                <select
                  aria-label="Filter marks by assigned class"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All assigned classes</option>
                  {listQuery.data.classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {listQuery.data.assessments.length === 0 ? (
              <StateCard
                text={
                  classId || search.trim()
                    ? 'No authorized assessments match these filters.'
                    : 'No assessments are available for your assigned classes.'
                }
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-black text-helixed-navy">Assessments</h2>
                  <div className="mt-3 space-y-2" aria-label="Authorized assessments">
                    {listQuery.data.assessments.map((assessment) => (
                      <button
                        key={assessment.id}
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setSelectedAssessmentId(assessment.id);
                        }}
                        className={`w-full rounded-xl border p-3 text-left ${selectedAssessmentId === assessment.id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-helixed-navy">{assessment.title}</p>
                            <p className="text-sm text-slate-500">
                              {assessment.class.name} · {assessment.subjectName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(assessment.assessedAt)} · {assessment.maximumMarks} marks
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                            {assessment.recordedCount}/{assessment.rosterCount} recorded
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <MarksRoster
                  assessment={detailQuery.data}
                  loading={detailQuery.isLoading || detailQuery.isFetching}
                  error={detailQuery.isError}
                  draft={draft}
                  onChange={(studentId, value) =>
                    setDraft((current) => ({ ...current, [studentId]: value }))
                  }
                  changes={changes.length}
                  invalid={hasInvalidValue}
                  saving={save.isPending}
                  notice={notice}
                  onSave={() => save.mutate()}
                />
              </div>
            )}
          </>
        )}
      </div>
    </TeacherShell>
  );
}

function MarksRoster({
  assessment,
  loading,
  error,
  draft,
  onChange,
  changes,
  invalid,
  saving,
  notice,
  onSave,
}: {
  assessment?: TeacherMarkAssessment;
  loading: boolean;
  error: boolean;
  draft: Record<string, string>;
  onChange: (studentId: string, value: string) => void;
  changes: number;
  invalid: boolean;
  saving: boolean;
  notice: string | null;
  onSave: () => void;
}) {
  if (loading) return <StateCard text="Loading the authorized marks roster…" />;
  if (error || !assessment)
    return <StateCard text="This assessment is unavailable." tone="error" />;
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            {assessment.class.name} · {assessment.subjectName}
          </p>
          <h2 className="text-xl font-black text-helixed-navy">{assessment.title}</h2>
          <p className="text-sm text-slate-500">
            {formatDate(assessment.assessedAt)} · Maximum {assessment.maximumMarks}
          </p>
        </div>
      </div>
      {assessment.roster.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No active students are available for this assessment.
        </p>
      ) : (
        <div className="mt-4 space-y-2" aria-label="Authorized marks roster">
          {assessment.roster.map((student) => (
            <div
              key={student.studentId}
              className="grid items-center gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-bold text-helixed-navy">{student.displayName}</p>
                <span
                  aria-label={`Recorded mark for ${student.displayName}: ${student.mark ?? 'NOT RECORDED'}`}
                  className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${student.mark === null ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {student.mark === null
                    ? 'NOT RECORDED'
                    : `${student.mark} / ${assessment.maximumMarks}`}
                </span>
              </div>
              <label className="text-xs font-bold text-slate-600">
                Mark
                <input
                  aria-label={`Mark for ${student.displayName}`}
                  type="number"
                  min={0}
                  max={assessment.maximumMarks}
                  step={1}
                  value={draft[student.studentId] ?? ''}
                  disabled={saving}
                  onChange={(event) => onChange(student.studentId, event.target.value)}
                  className="ml-2 w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      )}
      {invalid && (
        <p className="mt-4 text-sm font-semibold text-rose-700">
          Enter a whole-number mark between 0 and {assessment.maximumMarks}.
        </p>
      )}
      {notice && <p className="mt-4 text-sm font-semibold text-slate-700">{notice}</p>}
      {assessment.roster.length > 0 && (
        <button
          type="button"
          disabled={changes === 0 || invalid || saving}
          onClick={onSave}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? 'Saving official marks…' : 'Save official marks'}
        </button>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Missing marks remain not recorded; no zero is inferred.
      </p>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: number;
  tone?: 'blue' | 'amber' | 'green';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

function StateCard({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'error' }) {
  return (
    <div
      className={`rounded-2xl border p-8 text-center text-sm ${tone === 'error' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-slate-100 bg-white text-slate-500'}`}
    >
      {text}
    </div>
  );
}
