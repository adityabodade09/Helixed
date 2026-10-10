import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AcademyShell } from '../academy-dashboard/AcademyShell';
import { useAuth } from '../auth/useAuth';
import { academyCoachesApi } from './academyCoaches.api';

const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

export function AcademyCoachesPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['academy-coaches', search],
    queryFn: () => academyCoachesApi.list(accessToken!, search.trim() || undefined),
    enabled: !!accessToken,
  });

  return (
    <AcademyShell academyName={query.data?.academy.name ?? 'Academy'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Academy team</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Coaches</h1>
          <p className="mt-2 text-slate-600">
            Current Academy Coaches and their factual batch assignments.
          </p>
        </section>

        <section aria-label="Coach summary" className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
            <p className="text-sm font-semibold">Current Coaches</p>
            <p className="mt-1 text-3xl font-black">{query.data?.summary.coaches ?? '—'}</p>
          </div>
        </section>

        <section aria-label="Coach filters" className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <label>
            <span className="sr-only">Search coaches</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search coaches by name"
              type="search"
              value={search}
            />
          </label>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          {query.isLoading ? <p>Loading Academy coaches…</p> : null}
          {query.isError ? (
            <p className="rounded-xl bg-rose-50 p-4 text-rose-700">
              Academy coaches are unavailable.
            </p>
          ) : null}
          {query.data ? (
            query.data.coaches.length ? (
              <div className="divide-y divide-slate-100">
                {query.data.coaches.map((coach) => (
                  <article
                    key={coach.id}
                    data-coach-id={coach.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_180px] md:items-center"
                  >
                    <div>
                      <h2 className="font-bold text-helixed-navy">{coach.displayName}</h2>
                      <p className="text-xs text-slate-500">Current Academy Coach</p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {coach.batches.length
                        ? coach.batches.map(({ name }) => name).join(' · ')
                        : 'No current batch assignment'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {coach.batchCount} {coach.batchCount === 1 ? 'batch' : 'batches'}
                    </p>
                    <p className="text-sm text-slate-500">Joined {date(coach.joinedAt)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {search.trim()
                  ? 'No coaches match this Academy search.'
                  : 'No current Academy Coaches are recorded.'}
              </p>
            )
          ) : null}
        </section>
      </div>
    </AcademyShell>
  );
}
