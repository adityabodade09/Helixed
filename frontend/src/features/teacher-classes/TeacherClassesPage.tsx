import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherClassesApi } from './teacherClasses.api';

const formatSession = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export function TeacherClassesPage() {
  const { accessToken, user } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['teacher-classes', search],
    queryFn: () => teacherClassesApi.get(accessToken!, search || undefined),
    enabled: !!accessToken,
  });
  const teacherName = query.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black text-helixed-navy md:text-4xl">My Classes</h1>
              <p className="mt-2 text-slate-600">Classes you are currently authorized to teach.</p>
            </div>
            {query.data ? (
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-right">
                <p className="font-bold text-helixed-navy">{query.data.school.name}</p>
                <p className="text-sm text-slate-500">
                  {query.data.classes.length} assigned{' '}
                  {query.data.classes.length === 1 ? 'class' : 'classes'}
                </p>
              </div>
            ) : null}
          </div>
          <label className="mt-5 block max-w-md">
            <span className="sr-only">Search assigned classes</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assigned classes or subjects"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-helixed-blue focus:ring-2"
            />
          </label>
        </section>

        {query.isLoading ? <p className="mt-5">Loading assigned classes…</p> : null}
        {query.isError ? (
          <p className="mt-5 rounded-2xl bg-rose-50 p-5 text-rose-700">
            Teacher classes are unavailable.
          </p>
        ) : null}
        {query.data ? <TeacherClassesView classes={query.data.classes} search={search} /> : null}
      </div>
    </TeacherShell>
  );
}

function TeacherClassesView({
  classes,
  search,
}: {
  classes: Awaited<ReturnType<typeof teacherClassesApi.get>>['classes'];
  search: string;
}) {
  if (!classes.length) {
    return (
      <DashboardCard title="Assigned classes">
        <p className="py-6 text-sm text-slate-500">
          {search
            ? 'No assigned classes match this search.'
            : 'No active class assignments are available for this Teacher account.'}
        </p>
      </DashboardCard>
    );
  }

  return (
    <section
      className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Assigned classes"
    >
      {classes.map((schoolClass) => (
        <article
          key={schoolClass.id}
          className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-helixed-navy">{schoolClass.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {schoolClass.subjects.length
                  ? schoolClass.subjects.join(' · ')
                  : 'No official subject sessions recorded'}
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Assigned
            </span>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500">Authorized students</dt>
              <dd className="font-bold text-helixed-navy">{schoolClass.studentCount}</dd>
            </div>
            <div className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500">Open tasks</dt>
              <dd className="font-bold text-helixed-navy">{schoolClass.openTaskCount}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-slate-500">Next official session</dt>
              <dd className="mt-1 font-semibold text-helixed-navy">
                {schoolClass.nextSession
                  ? `${schoolClass.nextSession.subjectName} · ${formatSession(schoolClass.nextSession.startsAt)}`
                  : 'No scheduled official session'}
              </dd>
            </div>
          </dl>

          {schoolClass.attendanceRecordingPending ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {schoolClass.attendanceRecordingPending} completed{' '}
              {schoolClass.attendanceRecordingPending === 1 ? 'session is' : 'sessions are'} missing
              one or more official attendance records.
            </p>
          ) : null}
          <Link
            to={`/teacher/classes/${schoolClass.id}`}
            className="mt-4 inline-flex text-sm font-bold text-helixed-blue hover:underline"
          >
            Open class <span aria-hidden="true">→</span>
          </Link>
        </article>
      ))}
    </section>
  );
}

export function TeacherClassDetailPage() {
  const { id } = useParams();
  const { accessToken, user } = useAuth();
  const query = useQuery({
    queryKey: ['teacher-class', id],
    queryFn: () => teacherClassesApi.getDetail(accessToken!, id!),
    enabled: !!accessToken && !!id,
  });
  const teacherName = user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <Link
          to="/teacher/classes"
          className="text-sm font-semibold text-helixed-blue hover:underline"
        >
          ← Back to classes
        </Link>
        {query.isLoading ? <p className="mt-5">Loading class details…</p> : null}
        {query.isError ? (
          <p className="mt-5 rounded-2xl bg-rose-50 p-5 text-rose-700">
            Class access is unavailable.
          </p>
        ) : null}
        {query.data ? <TeacherClassDetailView detail={query.data} /> : null}
      </div>
    </TeacherShell>
  );
}

function TeacherClassDetailView({
  detail,
}: {
  detail: Awaited<ReturnType<typeof teacherClassesApi.getDetail>>;
}) {
  const completedSessions = detail.recentSessions.filter(({ state }) => state === 'COMPLETED');
  const knownAttendance = completedSessions.reduce(
    (total, session) => total + session.knownAttendanceCount,
    0,
  );
  const missingAttendance = completedSessions.reduce(
    (total, session) => total + session.missingAttendanceCount,
    0,
  );

  return (
    <>
      <section className="mt-4 rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">{detail.school.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-helixed-navy md:text-4xl">{detail.name}</h1>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Assigned
          </span>
        </div>
        <p className="mt-2 text-slate-600">
          {detail.subjects.length
            ? detail.subjects.join(' · ')
            : 'No official subject sessions recorded'}
        </p>
      </section>

      <section
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Class operations"
      >
        <SummaryCard label="Active students" value={String(detail.studentCount)} />
        <SummaryCard label="Open tasks" value={String(detail.openTaskCount)} />
        <SummaryCard
          label="Attendance recorded"
          value={
            completedSessions.length ? `${knownAttendance} known records` : 'No completed sessions'
          }
          description={
            missingAttendance
              ? `${missingAttendance} attendance records are not yet available.`
              : 'Missing records are kept distinct from absences.'
          }
        />
        <SummaryCard
          label="Next official session"
          value={
            detail.nextSession
              ? `${detail.nextSession.subjectName} · ${formatSession(detail.nextSession.startsAt)}`
              : 'None scheduled'
          }
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardCard title="Official class sessions">
          {!detail.recentSessions.length ? (
            <p className="py-6 text-sm text-slate-500">
              No official sessions are recorded for this class.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {detail.recentSessions.map((session) => (
                <li key={session.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-helixed-navy">{session.subjectName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatSession(session.startsAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {session.state.toLowerCase()}
                    </span>
                  </div>
                  {session.state === 'COMPLETED' ? (
                    <p className="mt-3 text-sm text-slate-600">
                      {session.knownAttendanceCount} known attendance records ·{' '}
                      {session.missingAttendanceCount} unavailable · {session.absentAttendanceCount}{' '}
                      recorded absent
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
        <DashboardCard title="Operational boundary">
          <p className="text-sm leading-6 text-slate-600">
            This read-only class view uses official class, task, and attendance records. Attendance
            that has not been recorded is not treated as absent.
          </p>
        </DashboardCard>
      </section>
    </>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-black text-helixed-navy">{value}</p>
      {description ? <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p> : null}
    </article>
  );
}
