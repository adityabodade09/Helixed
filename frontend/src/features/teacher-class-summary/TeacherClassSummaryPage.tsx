import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { teacherClassesApi } from '../teacher-classes/teacherClasses.api';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherClassSummaryApi, type TeacherClassSummary } from './teacherClassSummary.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const formatSession = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export function TeacherClassSummaryPage() {
  const { accessToken, user } = useAuth();
  const [classId, setClassId] = useState('');
  const classesQuery = useQuery({
    queryKey: ['teacher-classes', 'class-summary-selector'],
    queryFn: () => teacherClassesApi.get(accessToken!),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    const classes = classesQuery.data?.classes;
    if (!classes) return;
    setClassId((current) =>
      current && classes.some(({ id }) => id === current) ? current : (classes[0]?.id ?? ''),
    );
  }, [classesQuery.data]);

  const summaryQuery = useQuery({
    queryKey: ['teacher-class-summary', classId],
    queryFn: () => teacherClassSummaryApi.get(accessToken!, classId),
    enabled: Boolean(accessToken && classId),
  });
  const teacherName =
    summaryQuery.data?.teacher.displayName ??
    classesQuery.data?.teacher.displayName ??
    user?.displayName ??
    'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Factual class overview
              </p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
                Class Summary
              </h1>
              <p className="mt-2 text-slate-600">
                Current attendance, assignments, and assessments from canonical records.
              </p>
            </div>
            {classesQuery.data?.classes.length ? (
              <label className="text-xs font-bold text-slate-600">
                Assigned class
                <select
                  aria-label="Select assigned class"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  className="mt-2 block min-w-52 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {classesQuery.data.classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </section>

        {classesQuery.isLoading ? <StateCard text="Loading assigned classes…" /> : null}
        {classesQuery.isError ? <StateCard text="Class summary is unavailable." error /> : null}
        {classesQuery.data && classesQuery.data.classes.length === 0 ? (
          <StateCard text="No assigned classes are available to summarize." />
        ) : null}
        {classId && summaryQuery.isLoading ? <StateCard text="Loading class summary…" /> : null}
        {classId && summaryQuery.isError ? (
          <StateCard text="This class summary is restricted or unavailable." error />
        ) : null}
        {summaryQuery.data ? <SummaryView summary={summaryQuery.data} /> : null}
      </div>
    </TeacherShell>
  );
}

function SummaryView({ summary }: { summary: TeacherClassSummary }) {
  const attendanceValue =
    summary.attendance.presentRate === null ? 'Unavailable' : `${summary.attendance.presentRate}%`;
  const markValue =
    summary.assessments.normalizedAverage === null
      ? 'Unavailable'
      : `${summary.assessments.normalizedAverage}%`;
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Class facts">
        <FactCard label="Active students" value={summary.class.studentCount} />
        <FactCard label="Known present rate" value={attendanceValue} tone="green" />
        <FactCard label="Active assignments" value={summary.assignments.active} tone="amber" />
        <FactCard label="Assessments" value={summary.assessments.total} tone="violet" />
        <FactCard
          label="Next class"
          value={summary.nextSession ? summary.nextSession.subjectName : 'Not scheduled'}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-helixed-navy">Official attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            {summary.attendance.completedSessions} completed sessions ·{' '}
            {summary.attendance.knownRecords} recorded · {summary.attendance.missingRecords} not
            recorded
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SmallFact label="Present" value={summary.attendance.present} />
            <SmallFact label="Absent" value={summary.attendance.absent} />
            <SmallFact label="Late" value={summary.attendance.late} />
            <SmallFact label="Partial" value={summary.attendance.partial} />
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            NOT RECORDED is excluded from the known-record rate; it is never treated as absent.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-helixed-navy">Current mark evidence</h2>
          <p className="mt-1 text-sm text-slate-500">
            {summary.assessments.recordedMarks} recorded · {summary.assessments.missingMarks} not
            recorded
          </p>
          <p className="mt-4 text-3xl font-black text-violet-700">{markValue}</p>
          <p className="text-xs text-slate-500">Normalized average of recorded current marks</p>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Missing marks are excluded. An explicit recorded 0 remains a factual mark.
          </p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <RecordList
          title="Canonical assignments"
          empty="No assignments are recorded for this class."
          items={summary.assignments.items.map((item) => ({
            id: item.id,
            title: item.title,
            meta: `${item.subjectName} · ${item.status.toLowerCase()} · ${item.dueAt ? `Due ${formatDate(item.dueAt)}` : 'No due date'}`,
          }))}
          note={`${summary.assignments.dueSoon} active assignments due in the next 7 days. Submission metrics are not available.`}
        />
        <RecordList
          title="Recent assessments"
          empty="No assessments are recorded for this class."
          items={summary.assessments.items.map((item) => ({
            id: item.id,
            title: item.title,
            meta: `${item.subjectName} · ${formatDate(item.assessedAt)} · ${item.normalizedAverage === null ? 'NOT RECORDED' : `${item.normalizedAverage}% normalized average`} · ${item.recordedCount} recorded / ${item.missingCount} missing`,
          }))}
          note="Only current mark versions contribute; superseded corrections are excluded."
        />
      </div>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
        <h2 className="font-black">Next official session</h2>
        <p className="mt-1">
          {summary.nextSession
            ? `${summary.nextSession.subjectName} · ${formatSession(summary.nextSession.startsAt)}`
            : 'No upcoming scheduled session is available.'}
        </p>
      </section>
    </>
  );
}

function FactCard({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'amber' | 'violet';
}) {
  const colors = {
    blue: 'border-blue-100 text-blue-700',
    green: 'border-emerald-100 text-emerald-700',
    amber: 'border-amber-100 text-amber-700',
    violet: 'border-violet-100 text-violet-700',
  };
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${colors[tone]}`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function SmallFact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xl font-black text-helixed-navy">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function RecordList({
  title,
  empty,
  items,
  note,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; meta: string }[];
  note: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-helixed-navy">{title}</h2>
      {items.length ? (
        <div className="mt-3 divide-y divide-slate-100">
          {items.slice(0, 5).map((item) => (
            <article key={item.id} className="py-3">
              <p className="font-bold text-helixed-navy">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{empty}</p>
      )}
      <p className="mt-3 text-xs text-slate-400">{note}</p>
    </section>
  );
}

function StateCard({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p
      className={`rounded-2xl p-6 text-center text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-500 shadow-sm'}`}
    >
      {text}
    </p>
  );
}
