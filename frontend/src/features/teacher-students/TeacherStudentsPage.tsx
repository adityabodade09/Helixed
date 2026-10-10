import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherStudentsApi } from './teacherStudents.api';

export function TeacherStudentsPage() {
  const { accessToken, user } = useAuth();
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const query = useQuery({
    queryKey: ['teacher-students', search, classId],
    queryFn: () =>
      teacherStudentsApi.get(accessToken!, {
        search: search || undefined,
        classId: classId || undefined,
      }),
    enabled: !!accessToken,
  });
  const teacherName = query.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black text-helixed-navy md:text-4xl">My Students</h1>
              <p className="mt-2 text-slate-600">
                Students connected to your authorized teaching relationships.
              </p>
            </div>
            {query.data ? (
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-right">
                <p className="font-bold text-helixed-navy">{query.data.students.length} students</p>
                <p className="text-sm text-slate-500">{query.data.school.name}</p>
              </div>
            ) : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label>
              <span className="sr-only">Search authorized students</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students by name or class"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-helixed-blue focus:ring-2"
              />
            </label>
            <label>
              <span className="sr-only">Filter by assigned class</span>
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-helixed-blue focus:ring-2"
              >
                <option value="">All assigned classes</option>
                {query.data?.classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {query.isLoading ? <p className="mt-5">Loading authorized students…</p> : null}
        {query.isError ? (
          <p className="mt-5 rounded-2xl bg-rose-50 p-5 text-rose-700">
            Teacher students are unavailable.
          </p>
        ) : null}
        {query.data ? <TeacherStudentsView students={query.data.students} search={search} /> : null}
      </div>
    </TeacherShell>
  );
}

function TeacherStudentsView({
  students,
  search,
}: {
  students: Awaited<ReturnType<typeof teacherStudentsApi.get>>['students'];
  search: string;
}) {
  if (!students.length) {
    return (
      <DashboardCard title="Teaching-context roster">
        <p className="py-6 text-sm text-slate-500">
          {search
            ? 'No authorized students match this search.'
            : 'No active students are available in your assigned classes.'}
        </p>
      </DashboardCard>
    );
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
      aria-label="Authorized students"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span>Student</span>
        <span>Authorized class context</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {students.map((student) => (
          <li
            key={student.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 px-5 py-4"
          >
            <Link
              to={`/teacher/students/${student.id}`}
              className="font-bold text-helixed-navy hover:text-helixed-blue"
            >
              {student.displayName}
            </Link>
            <div className="space-y-1 text-sm text-slate-600">
              {student.classes.map((schoolClass) => (
                <p key={schoolClass.id}>
                  <span className="font-semibold text-helixed-blue">{schoolClass.name}</span>
                  {schoolClass.subjects.length ? ` · ${schoolClass.subjects.join(', ')}` : ''}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TeacherStudentDetailPage() {
  const { id = '' } = useParams();
  const { accessToken, user } = useAuth();
  const query = useQuery({
    queryKey: ['teacher-student-detail', id],
    queryFn: () => teacherStudentsApi.getDetail(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  const detail = query.data?.student.id === id ? query.data : undefined;
  const teacherName = detail?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <Link
          to="/teacher/students"
          className="text-sm font-semibold text-helixed-blue hover:underline"
        >
          ← Back to students
        </Link>
        {query.isLoading ? <p className="mt-5">Loading student teaching context…</p> : null}
        {query.isError ? (
          <p className="mt-5 rounded-2xl bg-rose-50 p-5 text-rose-700">
            Student teaching context is unavailable.
          </p>
        ) : null}
        {detail ? <TeacherStudentDetailView detail={detail} /> : null}
      </div>
    </TeacherShell>
  );
}

function TeacherStudentDetailView({
  detail,
}: {
  detail: Awaited<ReturnType<typeof teacherStudentsApi.getDetail>>;
}) {
  const summary = detail.attendance.summary;
  return (
    <>
      <section className="mt-4 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-blue-100 text-2xl font-black text-blue-700">
              {detail.student.displayName[0]}
            </span>
            <div>
              <p className="text-sm font-semibold text-helixed-blue">Student overview</p>
              <h1 className="text-3xl font-black text-helixed-navy">
                {detail.student.displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{detail.school.name}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {detail.classes.map((schoolClass) => (
              <div key={schoolClass.id} className="rounded-xl border border-blue-100 px-4 py-3">
                <p className="font-bold text-helixed-navy">{schoolClass.name}</p>
                <p className="text-sm text-slate-500">
                  {schoolClass.subjects.length
                    ? schoolClass.subjects.join(', ')
                    : 'No completed subject sessions'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <DashboardCard title="Official attendance">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryValue
              label="Present rate"
              value={summary.presentRate === null ? 'Not enough data' : `${summary.presentRate}%`}
            />
            <SummaryValue label="Known records" value={String(summary.knownSessions)} />
            <SummaryValue label="Not recorded" value={String(summary.missingSessions)} />
          </div>
          {detail.attendance.sessions.length ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {detail.attendance.sessions.slice(0, 8).map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold text-helixed-navy">{session.subjectName}</p>
                    <p className="text-sm text-slate-500">
                      {session.className} · {new Date(session.startsAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {session.state ?? 'NOT RECORDED'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No completed attendance sessions are available in this teaching context.
            </p>
          )}
        </DashboardCard>

        <DashboardCard title="Tasks">
          <p className="text-sm leading-6 text-slate-600">
            Task evidence is unavailable because current Student tasks are not canonically linked to
            a class. No unrelated tasks are shown.
          </p>
        </DashboardCard>
      </div>
    </>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-helixed-navy">{value}</p>
    </div>
  );
}
