import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AcademyShell } from '../academy-dashboard/AcademyShell';
import { useAuth } from '../auth/useAuth';
import { academyStudentsApi } from './academyStudents.api';

const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export function AcademyStudentsPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState('');
  const [batchId, setBatchId] = useState('');
  const query = useQuery({
    queryKey: ['academy-students', search, batchId],
    queryFn: () =>
      academyStudentsApi.list(accessToken!, {
        search: search.trim() || undefined,
        batchId: batchId || undefined,
      }),
    enabled: !!accessToken,
  });
  const filtered = !!search.trim() || !!batchId;

  return (
    <AcademyShell academyName={query.data?.academy.name ?? 'Academy'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Academy roster</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Students</h1>
          <p className="mt-2 text-slate-600">
            Active Students enrolled in this Academy and their current batch context.
          </p>
        </section>

        <section
          aria-label="Student filters"
          className="mt-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[1fr_280px]"
        >
          <label>
            <span className="sr-only">Search students</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students by name"
              type="search"
              value={search}
            />
          </label>
          <label>
            <span className="sr-only">Filter by batch</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
              onChange={(event) => setBatchId(event.target.value)}
              value={batchId}
            >
              <option value="">All batches</option>
              {query.data?.batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          {query.isLoading ? <p>Loading Academy students…</p> : null}
          {query.isError ? (
            <p className="rounded-xl bg-rose-50 p-4 text-rose-700">
              Academy students are unavailable.
            </p>
          ) : null}
          {query.data ? (
            query.data.students.length ? (
              <div className="divide-y divide-slate-100">
                {query.data.students.map((student) => (
                  <article
                    key={student.id}
                    data-student-id={student.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px] md:items-center"
                  >
                    <div>
                      <h2 className="font-bold text-helixed-navy">
                        <Link
                          className="hover:text-blue-700"
                          to={`/academy/students/${student.id}`}
                        >
                          {student.displayName}
                        </Link>
                      </h2>
                      <p className="text-xs text-slate-500">Academy-enrolled Student</p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {student.batches.length
                        ? student.batches.map(({ name }) => name).join(' · ')
                        : 'No batch assigned'}
                    </p>
                    <p className="text-sm text-slate-500">Enrolled {date(student.enrolledAt)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {filtered
                  ? 'No students match these Academy filters.'
                  : 'No active Academy enrollments are currently recorded.'}
              </p>
            )
          ) : null}
        </section>
      </div>
    </AcademyShell>
  );
}

export function AcademyStudentDetailPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['academy-student', id],
    queryFn: () => academyStudentsApi.detail(accessToken!, id),
    enabled: !!accessToken && !!id,
  });

  return (
    <AcademyShell academyName={query.data?.academy.name ?? 'Academy'}>
      <div className="mx-auto max-w-[1200px] p-4 md:p-6">
        <Link
          className="text-sm font-semibold text-blue-700 hover:underline"
          to="/academy/students"
        >
          ← Back to Students
        </Link>

        {query.isLoading ? <p className="mt-6">Loading Academy student…</p> : null}
        {query.isError ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">
            Academy student is unavailable.
          </p>
        ) : null}
        {query.data ? (
          <>
            <section className="mt-5 rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">Active Academy enrollment</p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
                {query.data.student.displayName}
              </h1>
              <p className="mt-2 text-slate-600">Enrolled {date(query.data.student.enrolledAt)}</p>
            </section>

            <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-helixed-navy">Academy batches</h2>
              {query.data.student.batches.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {query.data.student.batches.map((batch) => (
                    <article key={batch.id} className="rounded-xl border border-slate-100 p-4">
                      <p className="font-bold text-helixed-navy">{batch.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Current Academy batch</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No batch assigned.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AcademyShell>
  );
}
