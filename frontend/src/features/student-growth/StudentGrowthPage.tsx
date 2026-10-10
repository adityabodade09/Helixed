import { useQuery } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { StudentShell } from '../student-dashboard/StudentShell';
import { growthApi, type GrowthData } from './studentGrowth.api';
type Page = 'overview' | 'academics' | 'activities' | 'patterns' | 'achievements';
const pages: Array<[string, Page]> = [
  ['Overview', 'overview'],
  ['Academics', 'academics'],
  ['Activities', 'activities'],
  ['Patterns', 'patterns'],
  ['Achievements', 'achievements'],
];
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
        <section className="rounded-2xl border border-blue-50 bg-white px-5 py-5">
          <p className="text-xs font-semibold text-blue-700">Student › Growth</p>
          <h1 className="mt-2 text-3xl font-black text-helixed-navy">
            {page === 'overview'
              ? 'Your Growth'
              : page === 'academics'
                ? 'Academic Development'
                : page === 'activities'
                  ? 'Activity Development'
                  : page === 'patterns'
                    ? 'Development Patterns'
                    : 'Your Achievements'}
          </h1>
          <p className="text-slate-500">
            Evidence from your academics, activities, and participation—not a universal score.
          </p>
          <nav className="mt-5 flex flex-wrap gap-2">
            {pages.map(([label, value]) => (
              <Link
                key={value}
                to={value === 'overview' ? '/student/growth/overview' : `/student/growth/${value}`}
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
function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-blue-50">
      <div className="h-full rounded-full bg-blue-500" style={{ width: `${value}%` }} />
    </div>
  );
}
function Dimensions({ data }: { data: GrowthData }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.dimensions.map((item) => (
        <DashboardCard key={item.name} title={item.name}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{item.evidence}</span>
            <b className="text-helixed-navy">{item.value}%</b>
          </div>
          <div className="mt-3">
            <Bar value={item.value} />
          </div>
        </DashboardCard>
      ))}
    </div>
  );
}
export function StudentGrowthPage({ page = 'overview' }: { page?: Page }) {
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['student-growth', page],
    queryFn: () => growthApi.get(accessToken!, page),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <State>Loading your growth…</State>;
  if (query.isError || !query.data)
    return (
      <State>
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Growth is unavailable</h1>
          <button
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </div>
      </State>
    );
  const data = query.data;
  return (
    <Frame page={page}>
      {page === 'overview' ? (
        <Overview data={data} />
      ) : page === 'academics' ? (
        <Academics data={data} />
      ) : page === 'activities' ? (
        <Activities data={data} />
      ) : page === 'patterns' ? (
        <Patterns data={data} />
      ) : (
        <Achievements data={data} />
      )}
    </Frame>
  );
}
function Overview({ data }: { data: GrowthData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_320px]">
        <DashboardCard title={`Hi, ${data.studentName.split(' ')[0]} 👋`}>
          <p className="text-slate-600">Here is the evidence behind your development this term.</p>
          <Link
            to="/student/growth/academics"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            View detailed insights →
          </Link>
        </DashboardCard>
        <DashboardCard title="Key progress this period">
          <p className="text-sm text-slate-600">
            {data.academics.subjects.length} subjects tracked
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {data.patterns.activeActivities} active activities
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {data.patterns.groupMemberships} community memberships
          </p>
        </DashboardCard>
        <DashboardCard title="Suggested focus">
          <p className="text-sm text-slate-600">Use the evidence below to choose your next step.</p>
        </DashboardCard>
      </div>
      <Dimensions data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Achievements data={data} compact />
        <Patterns data={data} compact />
      </div>
    </div>
  );
}
function Academics({ data }: { data: GrowthData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <DashboardCard title="Subject-wise progress">
        <div className="space-y-4">
          {data.academics.subjects.length ? (
            data.academics.subjects.map((subject) => (
              <div key={subject.id}>
                <div className="flex justify-between text-sm">
                  <b>{subject.name}</b>
                  <span>{subject.progress}%</span>
                </div>
                <div className="mt-1">
                  <Bar value={subject.progress} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No academic evidence yet.</p>
          )}
        </div>
      </DashboardCard>
      <DashboardCard title="Task consistency">
        <p className="text-4xl font-black text-helixed-navy">{data.academics.taskCompletion}%</p>
        <p className="mt-2 text-sm text-slate-500">Based on completed canonical tasks.</p>
      </DashboardCard>
    </div>
  );
}
function Activities({ data }: { data: GrowthData }) {
  return (
    <DashboardCard title="Activity progress">
      <div className="grid gap-3 md:grid-cols-2">
        {data.activities.length ? (
          data.activities.map((activity) => (
            <article key={activity.id} className="rounded-xl border border-slate-100 p-4">
              <p className="font-bold text-helixed-navy">{activity.title}</p>
              <p className="text-sm text-slate-500">{activity.category ?? 'Other'}</p>
              <p className="mt-3 text-sm">
                {activity.completedMilestones} of {activity.milestones} milestones completed
              </p>
              <div className="mt-2">
                <Bar
                  value={
                    activity.milestones
                      ? Math.round((activity.completedMilestones / activity.milestones) * 100)
                      : 0
                  }
                />
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No activity evidence yet.</p>
        )}
      </div>
    </DashboardCard>
  );
}
function Patterns({ data, compact = false }: { data: GrowthData; compact?: boolean }) {
  return (
    <DashboardCard title="Development patterns">
      <div className={`grid gap-3 ${compact ? '' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
        {[
          ['Tasks created', data.patterns.tasksCreated],
          ['Tasks completed', data.patterns.tasksCompleted],
          ['Active activities', data.patterns.activeActivities],
          ['Community groups', data.patterns.groupMemberships],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-blue-50 p-4">
            <p className="text-2xl font-black text-helixed-navy">{value}</p>
            <p className="text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
function Achievements({ data, compact = false }: { data: GrowthData; compact?: boolean }) {
  const list = compact ? data.achievements.slice(0, 4) : data.achievements;
  return (
    <DashboardCard title="Recent achievements">
      <div className="space-y-3">
        {list.length ? (
          list.map((item) => (
            <article
              key={item.id}
              className="flex justify-between gap-3 rounded-xl border border-slate-100 p-3"
            >
              <div>
                <p className="font-semibold text-helixed-navy">{item.title}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>
              <span className="text-xs text-slate-400">
                {item.date
                  ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
                      new Date(item.date),
                    )
                  : ''}
              </span>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No achievements have been recorded yet.</p>
        )}
      </div>
    </DashboardCard>
  );
}
