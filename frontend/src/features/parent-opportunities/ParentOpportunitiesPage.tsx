import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { parentOpportunitiesApi, type ParentOpportunity } from './parentOpportunities.api';

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(value))
    : 'No deadline';

export function ParentOpportunitiesPage() {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<'' | 'OPEN' | 'CLOSED'>('OPEN');
  const [selectedId, setSelectedId] = useState<string>();
  const query = useQuery({
    queryKey: ['parent-opportunities', childId, search, category, availability],
    queryFn: () =>
      parentOpportunitiesApi.get(accessToken!, {
        childId,
        search: search || undefined,
        category: category || undefined,
        availability: availability || undefined,
      }),
    enabled: !!accessToken,
  });

  if (query.isLoading)
    return <main className="min-h-screen bg-slate-50 p-6">Loading opportunities…</main>;
  if (query.isError || !query.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Opportunities are unavailable for this account.
      </main>
    );

  const data = query.data;
  const selected = data.opportunities.find(({ id }) => id === selectedId) ?? null;
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-blue-600">Parent › Opportunities</p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
                Opportunities
              </h1>
              <p className="mt-2 text-slate-600">
                Explore programs and experiences while keeping decisions in the child’s own
                workflow.
              </p>
            </div>
            <select
              aria-label="Child"
              value={data.child.id}
              onChange={(event) => {
                setChildId(event.target.value);
                setSelectedId(undefined);
              }}
              className="rounded-xl border border-blue-100 bg-white p-3 font-semibold text-helixed-navy"
            >
              {data.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.displayName ?? 'Student'}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="mt-5 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5">
          <h2 className="text-xl font-black text-helixed-navy">
            Explore for {data.child.displayName}
          </h2>
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
              placeholder="Search opportunities…"
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

        <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h2 className="text-2xl font-black text-helixed-navy">Available opportunities</h2>
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
              <div className="mt-4">
                <DashboardCard title="No matching opportunities">
                  <p className="text-sm text-slate-600">
                    No Parent-visible opportunities match the selected filters.
                  </p>
                </DashboardCard>
              </div>
            )}
          </div>
          <aside>
            <DashboardCard title={selected ? selected.title : 'Opportunity details'}>
              {selected ? (
                <OpportunityDetail opportunity={selected} />
              ) : (
                <p className="text-sm text-slate-600">
                  Select an opportunity to review its canonical details. Eligibility is not inferred
                  from incomplete data.
                </p>
              )}
            </DashboardCard>
          </aside>
        </section>
      </div>
    </main>
  );
}

function OpportunityCard({
  opportunity,
  onSelect,
}: {
  opportunity: ParentOpportunity;
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
          <span
            className={`rounded-full px-2 py-1 ${opportunity.availability === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
          >
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
          onClick={onSelect}
          className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
        >
          View details
        </button>
      </div>
    </article>
  );
}

function OpportunityDetail({ opportunity }: { opportunity: ParentOpportunity }) {
  return (
    <div className="space-y-4 text-sm text-slate-600">
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
        Check eligibility details with the provider. This view does not predict acceptance.
      </p>
      {opportunity.approvalPending ? (
        <Link
          to="/parent/approvals"
          className="inline-flex rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
        >
          Review pending approval
        </Link>
      ) : null}
    </div>
  );
}
