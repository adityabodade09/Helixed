import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type Child = { id: string; displayName: string | null };
type ChildrenResponse = { children: Child[] };
type ChildResponse = {
  child: Child;
  overview: {
    openTasks: number;
    activeActivities: number;
    upcomingExams: number;
    upcomingScheduleItems: number;
  };
};

function State({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-50 p-6 text-slate-700">{children}</main>;
}

export function ParentChildrenPage() {
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => apiRequest<ChildrenResponse>('/parent/children', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <State>Loading linked children…</State>;
  if (query.isError || !query.data)
    return (
      <State>
        <p className="text-rose-600">Your linked children are unavailable.</p>
      </State>
    );
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Parent workspace</p>
          <h1 className="mt-1 text-4xl font-black text-helixed-navy">Children</h1>
          <p className="mt-2 text-slate-600">Each child has a separate, private Helixed context.</p>
        </header>
        <section className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
          <h2 className="text-xl font-bold text-helixed-navy">Your family on Helixed</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose one verified connection to view the information you are authorized to support.
          </p>
        </section>
        <section className="mt-5">
          <h2 className="text-2xl font-bold text-helixed-navy">Your children</h2>
          {query.data.children.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {query.data.children.map((child) => (
                <DashboardCard key={child.id} title={child.displayName ?? 'Student'}>
                  <p className="text-sm text-slate-500">Verified family connection</p>
                  <Link
                    className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    to={`/parent/children/${child.id}`}
                  >
                    View child overview
                  </Link>
                </DashboardCard>
              ))}
            </div>
          ) : (
            <DashboardCard title="No linked children">
              <p className="text-sm text-slate-600">
                There are no verified child connections available for this account.
              </p>
            </DashboardCard>
          )}
        </section>
      </div>
    </main>
  );
}

export function ParentChildDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['parent-child', id],
    queryFn: () =>
      apiRequest<ChildResponse>(`/parent/children/${id}`, { accessToken: accessToken! }),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading) return <State>Loading child overview…</State>;
  if (query.isError || !query.data)
    return (
      <State>
        <p className="text-rose-600">This child is not available in your authorized connections.</p>
      </State>
    );
  const { child, overview } = query.data;
  const destinations = ['Academics', 'Attendance', 'Tasks', 'Activities', 'Calendar', 'Teachers'];
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/parent/children" className="text-sm font-semibold text-blue-700">
          ← Children
        </Link>
        <header className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Verified child context</p>
          <h1 className="mt-1 text-4xl font-black text-helixed-navy">
            {child.displayName ?? 'Student'}
          </h1>
          <p className="mt-2 text-slate-600">
            A purpose-specific overview of information available to you.
          </p>
        </header>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Open tasks', overview.openTasks],
            ['Active activities', overview.activeActivities],
            ['Upcoming exams', overview.upcomingExams],
            ['Upcoming schedule items', overview.upcomingScheduleItems],
          ].map(([label, value]) => (
            <DashboardCard key={String(label)} title={String(label)}>
              <p className="text-3xl font-black text-helixed-navy">{value}</p>
            </DashboardCard>
          ))}
        </div>
        <section className="mt-5">
          <h2 className="text-xl font-bold text-helixed-navy">
            Explore this child’s authorized areas
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((name) => (
              <Link
                key={name}
                to={`/parent/children/${child.id}/${name.toLowerCase()}`}
                className="rounded-xl border border-blue-100 bg-white p-4 font-semibold text-blue-700"
              >
                {name} →
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
