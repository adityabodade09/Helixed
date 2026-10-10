import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import {
  teacherAttendanceApi,
  type AttendanceState,
  type SessionState,
  type TeacherAttendanceSession,
} from './teacherAttendance.api';

const attendanceStates: AttendanceState[] = ['PRESENT', 'ABSENT', 'LATE', 'PARTIAL'];
const stateStyle: Record<AttendanceState | 'NOT_RECORDED', string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  ABSENT: 'bg-rose-50 text-rose-700',
  LATE: 'bg-amber-50 text-amber-700',
  PARTIAL: 'bg-violet-50 text-violet-700',
  NOT_RECORDED: 'bg-slate-100 text-slate-600',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function attendanceDraft(session: TeacherAttendanceSession) {
  return Object.fromEntries(session.roster.map(({ studentId, status }) => [studentId, status]));
}

export function TeacherAttendancePage() {
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState('');
  const [sessionState, setSessionState] = useState<SessionState | ''>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, AttendanceState | null>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['teacher-attendance', classId, date, sessionState],
    queryFn: () =>
      teacherAttendanceApi.list(accessToken!, {
        classId: classId || undefined,
        date: date || undefined,
        state: sessionState || undefined,
      }),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    const sessions = listQuery.data?.sessions;
    if (!sessions) return;
    setSelectedSessionId((current) =>
      current && sessions.some(({ id }) => id === current) ? current : (sessions[0]?.id ?? null),
    );
  }, [listQuery.data]);

  const detailQuery = useQuery({
    queryKey: ['teacher-attendance-session', selectedSessionId],
    queryFn: () => teacherAttendanceApi.detail(accessToken!, selectedSessionId!),
    enabled: Boolean(accessToken && selectedSessionId),
  });

  useEffect(() => {
    if (!detailQuery.data) {
      setDraft({});
      return;
    }
    setDraft(attendanceDraft(detailQuery.data));
  }, [detailQuery.data]);

  const changes = useMemo(() => {
    if (!detailQuery.data) return [];
    return detailQuery.data.roster.flatMap((student) => {
      const state = draft[student.studentId];
      return state && state !== student.status
        ? [
            {
              studentId: student.studentId,
              state,
              expectedRecordId: student.currentRecordId,
            },
          ]
        : [];
    });
  }, [detailQuery.data, draft]);

  const save = useMutation({
    mutationFn: () => teacherAttendanceApi.record(accessToken!, selectedSessionId!, changes),
    onMutate: () => setNotice(null),
    onSuccess: (session) => {
      queryClient.setQueryData(['teacher-attendance-session', session.id], session);
      setDraft(attendanceDraft(session));
      void queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
      setNotice('Official attendance saved.');
    },
    onError: async () => {
      setNotice('Attendance was not saved. The authoritative record has been refreshed.');
      const refreshed = await detailQuery.refetch();
      if (refreshed.data) setDraft(attendanceDraft(refreshed.data));
    },
  });

  const teacherName = listQuery.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';
  const completed = listQuery.data?.sessions.filter(
    ({ recordingStatus }) => recordingStatus === 'COMPLETE',
  ).length;
  const pending = listQuery.data?.sessions.filter(
    ({ state, recordingStatus }) => state === 'COMPLETED' && recordingStatus !== 'COMPLETE',
  ).length;

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-7xl space-y-5 px-5 py-7 lg:px-8">
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Official records
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-helixed-navy">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record and review attendance only for your authorized classes.
          </p>
        </section>

        {listQuery.isLoading ? (
          <StateCard text="Loading assigned attendance sessions…" />
        ) : listQuery.isError || !listQuery.data ? (
          <StateCard text="Teacher attendance is unavailable." tone="error" />
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <SummaryCard label="Assigned sessions" value={listQuery.data.sessions.length} />
              <SummaryCard label="Pending records" value={pending ?? 0} tone="amber" />
              <SummaryCard label="Completed records" value={completed ?? 0} tone="green" />
            </section>

            <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3">
              <label className="text-xs font-bold text-slate-600">
                Assigned class
                <select
                  aria-label="Filter attendance by assigned class"
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
              <label className="text-xs font-bold text-slate-600">
                Session date
                <input
                  aria-label="Filter attendance by date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Session state
                <select
                  aria-label="Filter attendance by session state"
                  value={sessionState}
                  onChange={(event) => setSessionState(event.target.value as SessionState | '')}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All states</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            </section>

            {listQuery.data.sessions.length === 0 ? (
              <StateCard text="No attendance sessions are available for these filters." />
            ) : (
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-black text-helixed-navy">Assigned sessions</h2>
                  <div className="mt-3 space-y-2" aria-label="Assigned attendance sessions">
                    {listQuery.data.sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setSelectedSessionId(session.id);
                        }}
                        className={`w-full rounded-xl border p-3 text-left ${selectedSessionId === session.id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-helixed-navy">{session.className}</p>
                            <p className="text-sm text-slate-500">{session.subjectName}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDateTime(session.startsAt)}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                            {session.recordingStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {session.recordedCount} recorded · {session.missingCount} not recorded
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                <AttendanceRoster
                  session={detailQuery.data}
                  loading={detailQuery.isLoading || detailQuery.isFetching}
                  error={detailQuery.isError}
                  draft={draft}
                  onChange={(studentId, state) =>
                    setDraft((current) => ({ ...current, [studentId]: state }))
                  }
                  changes={changes.length}
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

function AttendanceRoster({
  session,
  loading,
  error,
  draft,
  onChange,
  changes,
  saving,
  notice,
  onSave,
}: {
  session?: TeacherAttendanceSession;
  loading: boolean;
  error: boolean;
  draft: Record<string, AttendanceState | null>;
  onChange: (studentId: string, state: AttendanceState) => void;
  changes: number;
  saving: boolean;
  notice: string | null;
  onSave: () => void;
}) {
  if (loading) return <StateCard text="Loading the authorized session roster…" />;
  if (error || !session)
    return <StateCard text="This attendance session is unavailable." tone="error" />;
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            {session.class.name}
          </p>
          <h2 className="text-xl font-black text-helixed-navy">{session.subjectName}</h2>
          <p className="text-sm text-slate-500">{formatDateTime(session.startsAt)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {session.state}
        </span>
      </div>
      {session.roster.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          No active students are available for this session.
        </p>
      ) : (
        <div className="mt-4 space-y-2" aria-label="Authorized attendance roster">
          {session.roster.map((student) => {
            const value = draft[student.studentId] ?? null;
            return (
              <div
                key={student.studentId}
                className="grid items-center gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-bold text-helixed-navy">{student.displayName}</p>
                  <span
                    aria-label={`Recorded status for ${student.displayName}: ${value ?? 'NOT RECORDED'}`}
                    className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${stateStyle[value ?? 'NOT_RECORDED']}`}
                  >
                    {value ?? 'NOT RECORDED'}
                  </span>
                </div>
                <select
                  aria-label={`Attendance for ${student.displayName}`}
                  value={value ?? ''}
                  disabled={!session.canRecord || saving}
                  onChange={(event) =>
                    onChange(student.studentId, event.target.value as AttendanceState)
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="" disabled={student.status !== null}>
                    Not recorded
                  </option>
                  {attendanceStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
      {!session.canRecord && (
        <p className="mt-4 text-sm text-slate-500">
          Recording is available only for completed sessions.
        </p>
      )}
      {notice && <p className="mt-4 text-sm font-semibold text-slate-700">{notice}</p>}
      {session.canRecord && session.roster.length > 0 && (
        <button
          type="button"
          disabled={changes === 0 || saving}
          onClick={onSave}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? 'Saving official attendance…' : 'Save official attendance'}
        </button>
      )}
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
