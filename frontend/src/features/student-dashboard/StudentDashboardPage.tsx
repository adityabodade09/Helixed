import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { getStudentDashboard } from './studentDashboard.api';
import type { StudentDashboard } from './studentDashboard.types';
import { StudentShell } from './StudentShell';

function dateTime(value: string | null): string {
  if (!value) return 'No date set';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function DashboardCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_26px_rgba(24,65,128,0.06)] ${className}`}
    >
      <h2 className="mb-3 text-[15px] font-bold text-helixed-navy">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-5 text-sm text-slate-500">No {label.toLowerCase()} yet.</p>;
}

export function StudentDashboardView({ dashboard }: { dashboard: StudentDashboard }) {
  const firstName = dashboard.student.displayName.split(' ')[0] || 'Student';
  return (
    <StudentShell
      studentName={dashboard.student.displayName}
      taskCount={dashboard.summary.tasksDue}
    >
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_275px]">
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-6 py-6">
              <div className="absolute -right-10 -top-24 size-72 rounded-full border-[30px] border-cyan-300/40" />
              <div className="absolute right-24 -bottom-24 size-64 rounded-full border-[28px] border-blue-500/30" />
              <p className="relative text-3xl font-black tracking-tight text-helixed-navy md:text-4xl">
                Good morning, <span className="text-blue-500">{firstName}!</span>
              </p>
              <p className="relative mt-1 text-base text-slate-500">
                Here’s what’s happening today. Keep going! ☀
              </p>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardCard title="Classes Today">
                <p className="text-3xl font-black text-helixed-navy">
                  {dashboard.summary.classesToday}
                </p>
                <p className="text-xs text-slate-500">classes</p>
              </DashboardCard>
              <DashboardCard title="Tasks Due">
                <p className="text-3xl font-black text-helixed-navy">
                  {dashboard.summary.tasksDue}
                </p>
                <p className="text-xs text-slate-500">tasks pending</p>
              </DashboardCard>
              <DashboardCard title="Upcoming Exam">
                <p className="truncate text-base font-bold text-helixed-navy">
                  {dashboard.summary.upcomingExam?.title ?? 'None planned'}
                </p>
                <p className="text-xs text-slate-500">
                  {dashboard.summary.upcomingExam
                    ? dateTime(dashboard.summary.upcomingExam.startsAt)
                    : 'Stay on track'}
                </p>
              </DashboardCard>
              <DashboardCard title="Overall Progress">
                <div className="flex items-center gap-3">
                  <span className="grid size-14 place-items-center rounded-full border-4 border-blue-500 text-sm font-bold text-helixed-navy">
                    {dashboard.summary.overallProgress ?? '—'}%
                  </span>
                  <span className="text-xs text-emerald-600">On track</span>
                </div>
              </DashboardCard>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <DashboardCard title="Today's Schedule">
                <div className="space-y-3">
                  {dashboard.schedule.length ? (
                    dashboard.schedule.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 border-l-2 pl-3"
                        style={{
                          borderColor:
                            item.color === 'orange'
                              ? '#fb923c'
                              : item.color === 'purple'
                                ? '#a855f7'
                                : item.color === 'green'
                                  ? '#22c55e'
                                  : '#3b82f6',
                        }}
                      >
                        <time className="w-16 shrink-0 text-xs font-semibold text-slate-500">
                          {new Intl.DateTimeFormat(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).format(new Date(item.startsAt))}
                        </time>
                        <div>
                          <p className="text-sm font-bold text-helixed-navy">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.detail}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty label="classes" />
                  )}
                </div>
              </DashboardCard>
              <DashboardCard title="My Tasks">
                <div className="space-y-3">
                  {dashboard.tasks.length ? (
                    dashboard.tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3">
                        <span className="mt-0.5 size-5 rounded-md border border-slate-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-helixed-navy">
                            {task.title}
                          </p>
                          <p className="text-xs text-slate-500">{dateTime(task.dueAt)}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${task.priority === 'high' ? 'bg-rose-100 text-rose-600' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    ))
                  ) : (
                    <Empty label="tasks" />
                  )}
                </div>
              </DashboardCard>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <DashboardCard title="Academic Progress" className="md:col-span-1">
                <div className="space-y-3">
                  {dashboard.subjects.length ? (
                    dashboard.subjects.map((subject) => (
                      <div key={subject.id}>
                        <div className="mb-1 flex justify-between text-xs font-medium text-helixed-navy">
                          <span>{subject.name}</span>
                          <span>{subject.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-blue-50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            style={{ width: `${subject.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty label="subjects" />
                  )}
                </div>
              </DashboardCard>
              <DashboardCard title="Activities & Growth">
                <div className="space-y-3">
                  {dashboard.activities.length ? (
                    dashboard.activities.map((activity) => (
                      <div key={activity.id}>
                        <p className="text-sm font-semibold text-helixed-navy">{activity.title}</p>
                        <p className="text-xs text-slate-500">
                          {activity.detail ?? dateTime(activity.occursAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <Empty label="activities" />
                  )}
                </div>
              </DashboardCard>
              <DashboardCard title="Opportunities for You">
                <div className="space-y-3">
                  {dashboard.opportunities.length ? (
                    dashboard.opportunities.map((opportunity) => (
                      <div key={opportunity.id}>
                        <p className="text-sm font-semibold text-helixed-navy">
                          {opportunity.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {opportunity.detail ?? 'Explore details'}
                          {opportunity.deadline ? ` · ${dateTime(opportunity.deadline)}` : ''}
                        </p>
                      </div>
                    ))
                  ) : (
                    <Empty label="opportunities" />
                  )}
                </div>
              </DashboardCard>
            </div>
          </div>
          <aside className="space-y-4">
            <DashboardCard
              title={new Intl.DateTimeFormat(undefined, {
                month: 'long',
                year: 'numeric',
              }).format(new Date(dashboard.today))}
            >
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
                {Array.from({ length: 28 }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index + 1 === new Date(dashboard.today).getDate()
                        ? 'grid size-7 place-items-center justify-self-center rounded-full bg-blue-600 font-bold text-white'
                        : ''
                    }
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
            </DashboardCard>
            <DashboardCard title="Announcements">
              <div className="space-y-3">
                {dashboard.announcements.length ? (
                  dashboard.announcements.map((announcement) => (
                    <div key={announcement.id} className="flex gap-2">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-helixed-navy">
                          {announcement.title}
                        </p>
                        <p className="text-xs text-slate-500">{dateTime(announcement.createdAt)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty label="announcements" />
                )}
              </div>
            </DashboardCard>
            <DashboardCard title="Quick Links">
              <div className="grid grid-cols-3 gap-2">
                {['Notes', 'Assignments', 'Results', 'Certificates', 'Clubs', 'Career'].map(
                  (link) => (
                    <button
                      key={link}
                      className="rounded-xl border border-slate-100 p-3 text-xs font-medium text-helixed-navy hover:bg-blue-50"
                    >
                      {link}
                    </button>
                  ),
                )}
              </div>
            </DashboardCard>
          </aside>
        </div>
        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_8px_26px_rgba(24,65,128,0.06)] md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-xl">✦</span>
            <div>
              <p className="font-bold text-helixed-navy">Helix AI</p>
              <p className="text-xs text-slate-500">Your personal academic and growth assistant.</p>
            </div>
          </div>
          <div className="flex flex-1 rounded-xl border border-blue-100 px-3 py-2 text-sm text-slate-400">
            Ask anything — explain a concept, plan your day, find opportunities...
          </div>
          <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Ask Helix
          </button>
        </section>
      </div>
    </StudentShell>
  );
}

export function StudentDashboardPage() {
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => getStudentDashboard(accessToken!),
    enabled: !!accessToken,
  });
  if (query.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
        Loading your dashboard…
      </main>
    );
  if (query.isError)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Your dashboard is unavailable</h1>
          <p className="mt-2 text-slate-500">Please try again in a moment.</p>
          <button
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  return query.data ? <StudentDashboardView dashboard={query.data} /> : null;
}
