import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AcademyShell } from '../academy-dashboard/AcademyShell';
import { useAuth } from '../auth/useAuth';
import { academyBatchesApi } from './academyBatches.api';

export function AcademyBatchesPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['academy-batches', search],
    queryFn: () => academyBatchesApi.list(accessToken!, search.trim() || undefined),
    enabled: !!accessToken,
  });

  return (
    <AcademyShell academyName={query.data?.academy.name ?? 'Academy'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Academy operations</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Batches</h1>
          <p className="mt-2 text-slate-600">
            Canonical Academy batches with factual current Student and Coach relationship counts.
          </p>
        </section>

        {query.data ? (
          <section aria-label="Batch summary" className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric title="Batches" value={query.data.summary.batches} />
            <Metric title="Enrolled students" value={query.data.summary.enrolledStudents} />
            <Metric title="Assigned coaches" value={query.data.summary.assignedCoaches} />
          </section>
        ) : null}

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <label>
            <span className="sr-only">Search batches</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search batches by name"
              type="search"
              value={search}
            />
          </label>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          {query.isLoading ? <p>Loading Academy batches…</p> : null}
          {query.isError ? (
            <p className="rounded-xl bg-rose-50 p-4 text-rose-700">
              Academy batches are unavailable.
            </p>
          ) : null}
          {query.data ? (
            query.data.batches.length ? (
              <div className="divide-y divide-slate-100">
                {query.data.batches.map((batch) => (
                  <article
                    key={batch.id}
                    data-batch-id={batch.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_180px_180px] sm:items-center"
                  >
                    <div>
                      <h2 className="font-bold text-helixed-navy">
                        <Link className="hover:text-blue-700" to={`/academy/batches/${batch.id}`}>
                          {batch.name}
                        </Link>
                      </h2>
                      <p className="text-xs text-slate-500">Canonical Academy batch</p>
                    </div>
                    <p className="text-sm text-slate-600">
                      <b>{batch.studentCount}</b> Students
                    </p>
                    <p className="text-sm text-slate-600">
                      <b>{batch.coachCount}</b> Coaches
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {search.trim()
                  ? 'No batches match this Academy search.'
                  : 'No Academy batches are currently recorded.'}
              </p>
            )
          ) : null}
        </section>
      </div>
    </AcademyShell>
  );
}

export function AcademyBatchDetailPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['academy-batch', id],
    queryFn: () => academyBatchesApi.detail(accessToken!, id),
    enabled: !!accessToken && !!id,
  });

  return (
    <AcademyShell academyName={query.data?.academy.name ?? 'Academy'}>
      <div className="mx-auto max-w-[1200px] p-4 md:p-6">
        <Link className="text-sm font-semibold text-blue-700 hover:underline" to="/academy/batches">
          ← Back to Batches
        </Link>

        {query.isLoading ? <p className="mt-6">Loading Academy batch…</p> : null}
        {query.isError ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">
            Academy batch is unavailable.
          </p>
        ) : null}
        {query.data ? (
          <>
            <section className="mt-5 rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">Canonical Academy batch</p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
                {query.data.batch.name}
              </h1>
            </section>

            <section aria-label="Batch member summary" className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric title="Students" value={query.data.summary.students} />
              <Metric title="Coaches" value={query.data.summary.coaches} />
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <MemberList
                empty="No current Students are assigned to this batch."
                label="Students"
                members={query.data.students}
              />
              <MemberList
                empty="No current Coaches are assigned to this batch."
                label="Coaches"
                members={query.data.coaches}
              />
            </div>
          </>
        ) : null}
      </div>
    </AcademyShell>
  );
}

function MemberList({
  empty,
  label,
  members,
}: {
  empty: string;
  label: string;
  members: { id: string; displayName: string }[];
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-helixed-navy">{label}</h2>
      {members.length ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {members.map((member) => (
            <li key={member.id} data-member-id={member.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-bold text-helixed-navy">{member.displayName}</p>
              <p className="text-xs text-slate-500">Current batch {label.slice(0, -1)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
