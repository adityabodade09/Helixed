import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { StudentShell } from '../student-dashboard/StudentShell';
import { opportunitiesApi, type Opportunity } from './studentOpportunities.api';
type Page = 'discover' | 'saved' | 'applied' | 'recommended';
const tabs: Array<[string, Page]> = [
  ['Discover', 'discover'],
  ['Recommended', 'recommended'],
  ['Saved', 'saved'],
  ['Applied', 'applied'],
];
const date = (x: string | null) =>
  x
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(x))
    : 'No deadline';
function State({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-600">
      {children}
    </main>
  );
}
function Frame({ page, children }: PropsWithChildren<{ page: Page }>) {
  const { user } = useAuth();
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white p-5">
          <p className="text-xs font-semibold text-blue-700">Student › Opportunities</p>
          <h1 className="mt-2 text-3xl font-black text-helixed-navy">
            {page === 'discover'
              ? 'Opportunities'
              : `${page[0].toUpperCase()}${page.slice(1)} Opportunities`}
          </h1>
          <p className="text-slate-500">
            Explore programs, scholarships, events, and experiences that fit your interests and
            goals.
          </p>
          <nav className="mt-5 flex flex-wrap gap-2">
            {tabs.map(([label, value]) => (
              <Link
                key={value}
                to={
                  value === 'discover'
                    ? '/student/opportunities'
                    : `/student/opportunities/${value}`
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${page === value ? 'bg-blue-600 text-white' : 'border border-blue-100 text-blue-700'}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </section>
        <div className="mt-4">{children}</div>
      </div>
    </StudentShell>
  );
}
function Cards({ items }: { items: Opportunity[] }) {
  const { accessToken } = useAuth();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: async (item: Opportunity) => {
      if (item.saved) await opportunitiesApi.unsave(accessToken!, item.id);
      else await opportunitiesApi.save(accessToken!, item.id);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['student-opportunities'] }),
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.length ? (
        items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            <div className="h-24 bg-gradient-to-r from-blue-200 via-cyan-50 to-indigo-200" />
            <div className="p-4">
              <div className="flex justify-between gap-2">
                <Link
                  to={`/student/opportunities/${item.id}`}
                  className="font-bold text-helixed-navy"
                >
                  {item.title}
                </Link>
                <button
                  aria-label="Save opportunity"
                  onClick={() => save.mutate(item)}
                  className="text-blue-600"
                >
                  {item.saved ? '★' : '☆'}
                </button>
              </div>
              <p className="mt-1 min-h-10 text-sm text-slate-500">{item.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                  {item.category ?? 'Opportunity'}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  {item.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {item.source ?? 'Helixed'} · {item.location ?? 'Online'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Apply by {date(item.deadline)}</p>
              <div className="mt-4 flex gap-2">
                <Link
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  to={`/student/opportunities/${item.id}`}
                >
                  View details
                </Link>
                {item.application ? (
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {item.application.state.toLowerCase()}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        ))
      ) : (
        <p className="text-slate-500">No opportunities match this view.</p>
      )}
    </div>
  );
}
export function StudentOpportunitiesPage({ page = 'discover' }: { page?: Page }) {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState('');
  const route = page === 'discover' ? '' : `/${page}`;
  const query = useQuery({
    queryKey: ['student-opportunities', page, search],
    queryFn: () => opportunitiesApi.list(accessToken!, route, search),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <State>Loading opportunities…</State>;
  if (query.isError || !query.data)
    return (
      <State>
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Opportunities are unavailable</h1>
          <button
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </div>
      </State>
    );
  return (
    <Frame page={page}>
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5">
        <h2 className="text-xl font-black text-helixed-navy">Discover your next opportunity</h2>
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Search opportunities"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search opportunities…"
            className="min-w-0 flex-1 rounded-xl border border-blue-100 p-3"
          />
          <button className="rounded-xl bg-blue-600 px-4 text-white">Search</button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <DashboardCard title="Filters">
          <p className="text-sm text-slate-500">
            Categories, deadline, location, and eligibility filters are available as the catalog
            grows.
          </p>
        </DashboardCard>
        <Cards items={query.data} />
      </div>
    </Frame>
  );
}
export function StudentOpportunityDetailPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['student-opportunities', id],
    queryFn: () => opportunitiesApi.get(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  const apply = useMutation({
    mutationFn: () => opportunitiesApi.apply(accessToken!, id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['student-opportunities'] }),
  });
  if (query.isLoading) return <State>Loading opportunity…</State>;
  if (query.isError || !query.data) return <State>Opportunity unavailable.</State>;
  const item = query.data;
  return (
    <Frame page="discover">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-100 via-white to-cyan-100 p-6">
            <p className="text-sm text-blue-700">{item.category ?? 'Opportunity'}</p>
            <h2 className="mt-2 text-4xl font-black text-helixed-navy">{item.title}</h2>
            <p className="mt-2 text-slate-600">{item.detail}</p>
          </section>
          <DashboardCard title="About this opportunity">
            <p className="text-slate-600">{item.description ?? item.detail}</p>
          </DashboardCard>
          <DashboardCard title="Key details">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p>
                <b>Source:</b> {item.source ?? 'Not specified'}
              </p>
              <p>
                <b>Location:</b> {item.location ?? 'Not specified'}
              </p>
              <p>
                <b>Deadline:</b> {date(item.deadline)}
              </p>
              <p>
                <b>Status:</b> {item.isOpen ? 'Applications open' : 'Closed'}
              </p>
            </div>
          </DashboardCard>
        </div>
        <aside className="space-y-4">
          <DashboardCard title="Application">
            <button
              disabled={!item.isOpen || !!item.application || apply.isPending}
              onClick={() => apply.mutate()}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white"
            >
              {item.application ? item.application.state.toLowerCase() : 'Apply now →'}
            </button>
            {apply.isError ? (
              <p className="mt-2 text-sm text-rose-600">Could not create application.</p>
            ) : null}
          </DashboardCard>
          <DashboardCard title="Eligibility">
            <p className="text-sm text-slate-500">
              Eligibility is not inferred as an acceptance prediction. Check requirements with the
              provider.
            </p>
          </DashboardCard>
        </aside>
      </div>
    </Frame>
  );
}
