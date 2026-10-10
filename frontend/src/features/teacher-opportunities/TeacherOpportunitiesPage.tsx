import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherOpportunitiesApi, type TeacherOpportunity } from './teacherOpportunities.api';

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(value))
    : 'No deadline';

export function TeacherOpportunitiesPage() {
  const { accessToken } = useAuth();
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<'' | 'OPEN' | 'CLOSED'>('OPEN');
  const [selectedId, setSelectedId] = useState<string>();
  const query = useQuery({
    queryKey: ['teacher-opportunities', search, category, availability],
    queryFn: () =>
      teacherOpportunitiesApi.get(accessToken!, {
        search: search || undefined,
        category: category || undefined,
        availability: availability || undefined,
      }),
    enabled: !!accessToken,
  });

  if (query.isLoading)
    return <div className="p-8 text-slate-600">Loading Teacher opportunities…</div>;
  if (query.isError || !query.data)
    return (
      <div className="p-8 text-rose-600">Teacher opportunities are restricted or unavailable.</div>
    );

  const data = query.data;
  const selected = data.opportunities.find(({ id }) => id === selectedId) ?? null;
  return (
    <TeacherShell teacherName={data.teacher.displayName}>
      <div className="mx-auto max-w-7xl p-5 lg:p-8">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Teacher · {data.school.name}</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy">Opportunities</h1>
          <p className="mt-2 text-slate-600">
            Discover canonical programs, competitions, scholarships, and experiences.
          </p>
        </header>

        <section className="mt-5 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5">
          <h2 className="text-xl font-black text-helixed-navy">Discover opportunities</h2>
          <p className="mt-1 text-sm text-slate-600">{data.discovery.explanation}</p>
          <form
            className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px_180px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim());
              setSelectedId(undefined);
            }}
          >
            <input
              aria-label="Search opportunities"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search by title, keyword, or provider…"
              className="rounded-xl border border-blue-100 bg-white p-3"
            />
            <select
              aria-label="Category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setSelectedId(undefined);
              }}
              className="rounded-xl border border-blue-100 bg-white p-3"
            >
              <option value="">All categories</option>
              {data.filters.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              aria-label="Availability"
              value={availability}
              onChange={(event) => {
                setAvailability(event.target.value as '' | 'OPEN' | 'CLOSED');
                setSelectedId(undefined);
              }}
              className="rounded-xl border border-blue-100 bg-white p-3"
            >
              <option value="">Any availability</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
              Search
            </button>
          </form>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <h2 className="text-2xl font-black text-helixed-navy">Canonical catalog</h2>
            {data.opportunities.length ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    onSelect={() => setSelectedId(opportunity.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-helixed-navy">No matching opportunities</h3>
                <p className="mt-2 text-sm text-slate-600">
                  No Teacher-visible opportunities match the selected filters.
                </p>
              </div>
            )}
          </div>
          <aside className="h-fit rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-helixed-navy">
              {selected?.title ?? 'Opportunity details'}
            </h2>
            {selected ? (
              <OpportunityDetail opportunity={selected} />
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Select an opportunity to review its published facts. No Student eligibility or
                acceptance prediction is calculated.
              </p>
            )}
          </aside>
        </section>
      </div>
    </TeacherShell>
  );
}

function OpportunityCard({
  opportunity,
  onSelect,
}: {
  opportunity: TeacherOpportunity;
  onSelect: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="h-20 bg-gradient-to-r from-blue-200 via-cyan-50 to-indigo-200" />
      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
            {opportunity.category ?? 'Opportunity'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
            {opportunity.availability === 'OPEN' ? 'Open' : 'Closed'}
          </span>
        </div>
        <h3 className="mt-3 font-bold text-helixed-navy">{opportunity.title}</h3>
        <p className="mt-1 min-h-10 text-sm text-slate-500">{opportunity.detail}</p>
        <p className="mt-3 text-xs text-slate-500">
          {opportunity.provider ?? 'Provider not specified'} ·{' '}
          {opportunity.location ?? 'Location not specified'}
        </p>
        <p className="mt-1 text-xs text-slate-500">Deadline: {formatDate(opportunity.deadline)}</p>
        <button
          type="button"
          onClick={onSelect}
          className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
        >
          View details
        </button>
      </div>
    </article>
  );
}

function OpportunityDetail({ opportunity }: { opportunity: TeacherOpportunity }) {
  return (
    <div className="mt-3 space-y-4 text-sm text-slate-600">
      <p>{opportunity.description ?? opportunity.detail ?? 'No description is available.'}</p>
      <dl className="space-y-2">
        <div className="flex justify-between gap-4">
          <dt>Provider</dt>
          <dd className="text-right font-semibold text-helixed-navy">
            {opportunity.provider ?? 'Not specified'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Location</dt>
          <dd>{opportunity.location ?? 'Not specified'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Deadline</dt>
          <dd>{formatDate(opportunity.deadline)}</dd>
        </div>
      </dl>
      <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
        Review the provider’s published criteria. This view does not determine Student eligibility
        or predict acceptance.
      </p>
    </div>
  );
}
