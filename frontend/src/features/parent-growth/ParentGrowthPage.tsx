import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type Page = 'overview' | 'academics' | 'activities' | 'patterns' | 'achievements';
type Growth = {
  children: { id: string; displayName: string | null }[];
  child: { id: string; displayName: string };
  dimensions: { name: string; value: number; evidence: string }[];
  academics: { subjects: { id: string; name: string; progress: number }[]; taskCompletion: number };
  activities: {
    id: string;
    title: string;
    category: string | null;
    milestones: number;
    completedMilestones: number;
  }[];
  patterns: {
    tasksCreated: number;
    tasksCompleted: number;
    activeActivities: number;
    certificates: number;
  };
  achievements: { id: string; title: string; category: string; date: string | null }[];
};
const pages: Array<[string, Page]> = [
  ['Overview', 'overview'],
  ['Academics', 'academics'],
  ['Activities', 'activities'],
  ['Patterns', 'patterns'],
  ['Achievements', 'achievements'],
];
function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-blue-50">
      <div className="h-full rounded-full bg-blue-500" style={{ width: `${value}%` }} />
    </div>
  );
}
function Achievements({ data }: { data: Growth }) {
  return (
    <DashboardCard title="Achievements and evidence">
      <div className="space-y-3">
        {data.achievements.length ? (
          data.achievements.map((item) => (
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
          <p className="text-sm text-slate-500">No parent-visible achievements yet.</p>
        )}
      </div>
    </DashboardCard>
  );
}

export function ParentGrowthPage({ page = 'overview' }: { page?: Page }) {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const query = useQuery({
    queryKey: ['parent-growth', page, childId],
    queryFn: () =>
      apiRequest<Growth>(
        `/parent/growth/${page === 'overview' ? 'overview' : page}${childId ? `?childId=${childId}` : ''}`,
        { accessToken: accessToken! },
      ),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <p className="p-6">Loading growth evidence…</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-rose-600">Growth evidence is unavailable.</p>;
  const data = query.data;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white p-5">
        <b className="text-2xl text-helixed-navy">Parent Insights</b>
      </header>
      <div className="mx-auto max-w-6xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Evidence-based development view</p>
            <h1 className="text-3xl font-black text-helixed-navy">
              {data.child.displayName}'s growth
            </h1>
          </div>
          <select
            aria-label="Child"
            value={data.child.id}
            onChange={(event) => setChildId(event.target.value)}
            className="rounded-xl border border-blue-100 bg-white p-3"
          >
            {data.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.displayName ?? 'Student'}
              </option>
            ))}
          </select>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2">
          {pages.map(([label, value]) => (
            <Link
              key={value}
              to={value === 'overview' ? '/parent/growth/overview' : `/parent/growth/${value}`}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${page === value ? 'bg-blue-600 text-white' : 'border border-blue-100 text-blue-700'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-4">
          {page === 'overview' ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {data.dimensions.map((dimension) => (
                  <DashboardCard key={dimension.name} title={dimension.name}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{dimension.evidence}</span>
                      <b>{dimension.value}%</b>
                    </div>
                    <div className="mt-3">
                      <Bar value={dimension.value} />
                    </div>
                  </DashboardCard>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Achievements data={data} />
                <DashboardCard title="Supportive patterns">
                  <p className="text-sm text-slate-600">
                    {data.patterns.tasksCompleted} completed tasks and{' '}
                    {data.patterns.activeActivities} active activities provide the available
                    evidence for this view.
                  </p>
                </DashboardCard>
              </div>
            </div>
          ) : page === 'academics' ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
              <DashboardCard title="Academic development">
                {data.academics.subjects.length ? (
                  data.academics.subjects.map((subject) => (
                    <div key={subject.id} className="py-2">
                      <div className="flex justify-between text-sm">
                        <b>{subject.name}</b>
                        <span>{subject.progress}%</span>
                      </div>
                      <div className="mt-2">
                        <Bar value={subject.progress} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No parent-visible academic evidence yet.</p>
                )}
              </DashboardCard>
              <DashboardCard title="Task consistency">
                <p className="text-4xl font-black text-helixed-navy">
                  {data.academics.taskCompletion}%
                </p>
                <p className="text-sm text-slate-500">Based on canonical task completion.</p>
              </DashboardCard>
            </div>
          ) : page === 'activities' ? (
            <DashboardCard title="Activity development">
              <div className="grid gap-3 md:grid-cols-2">
                {data.activities.length ? (
                  data.activities.map((activity) => (
                    <article key={activity.id} className="rounded-xl border border-slate-100 p-4">
                      <p className="font-bold text-helixed-navy">{activity.title}</p>
                      <p className="text-sm text-slate-500">{activity.category ?? 'Activity'}</p>
                      <p className="mt-3 text-sm">
                        {activity.completedMilestones} of {activity.milestones} milestones completed
                      </p>
                      <div className="mt-2">
                        <Bar
                          value={
                            activity.milestones
                              ? Math.round(
                                  (activity.completedMilestones / activity.milestones) * 100,
                                )
                              : 0
                          }
                        />
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No parent-visible activity evidence yet.</p>
                )}
              </div>
            </DashboardCard>
          ) : page === 'patterns' ? (
            <DashboardCard title="Development patterns">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Tasks created', data.patterns.tasksCreated],
                  ['Tasks completed', data.patterns.tasksCompleted],
                  ['Active activities', data.patterns.activeActivities],
                  ['Certificates', data.patterns.certificates],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-blue-50 p-4">
                    <p className="text-2xl font-black text-helixed-navy">{value}</p>
                    <p className="text-sm text-slate-600">{label}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          ) : (
            <Achievements data={data} />
          )}
        </div>
      </div>
    </main>
  );
}
