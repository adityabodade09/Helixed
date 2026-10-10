import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { useAuth } from '../auth/useAuth';
import { parentInsightsApi } from './parentInsights.api';

const shortDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));

export function ParentInsightsPage() {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const insights = useQuery({
    queryKey: ['parent-insights', childId],
    queryFn: () => parentInsightsApi.get(accessToken!, childId),
    enabled: !!accessToken,
  });

  if (insights.isLoading)
    return <main className="min-h-screen bg-slate-50 p-6">Loading insights…</main>;
  if (insights.isError || !insights.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Insights are unavailable for this account.
      </main>
    );

  const data = insights.data;
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-blue-600">Parent › Insights</p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Insights</h1>
              <p className="mt-2 text-slate-600">
                Factual patterns from Parent-visible records, with the evidence behind them.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                aria-label="Child"
                value={data.child.id}
                onChange={(event) => setChildId(event.target.value)}
                className="rounded-xl border border-blue-100 bg-white p-3 font-semibold text-helixed-navy"
              >
                {data.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.displayName ?? 'Student'}
                  </option>
                ))}
              </select>
              <span className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
                {data.period.label}
              </span>
            </div>
          </div>
        </header>

        <h2 className="mt-6 text-2xl font-black text-helixed-navy">
          Evidence for {data.child.displayName}
        </h2>

        {!data.hasEvidence ? (
          <section className="mt-4">
            <DashboardCard title="Not enough recorded data">
              <p className="text-sm text-slate-600">
                No Parent-visible academic, attendance, task, activity, or upcoming schedule
                evidence is available for this child in the selected period.
              </p>
            </DashboardCard>
          </section>
        ) : (
          <>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <EvidenceCard
                title="Academics"
                value={`${data.subjects.length} subjects`}
                detail="with recorded progress"
                tone="blue"
              />
              <EvidenceCard
                title="Attendance"
                value={
                  data.attendance.presentRate === null
                    ? 'Insufficient data'
                    : `${data.attendance.presentRate}% present`
                }
                detail={`${data.attendance.knownSessions} known · ${data.attendance.missingSessions} missing`}
                tone="emerald"
              />
              <EvidenceCard
                title="Tasks"
                value={`${data.tasks.completed} completed`}
                detail={`${data.tasks.dueThisWeek} due in the next 7 days`}
                tone="amber"
              />
              <EvidenceCard
                title="Activities"
                value={`${data.activities.active} active`}
                detail={`${data.activities.completedMilestones} of ${data.activities.milestones} milestones complete`}
                tone="violet"
              />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
              <DashboardCard title={`Key evidence for ${data.child.displayName}`}>
                <div className="space-y-3">
                  {data.facts.map((fact) => (
                    <article key={fact.id} className="rounded-xl border border-slate-100 p-4">
                      <p className="text-xs font-bold text-blue-600">{fact.category}</p>
                      <p className="mt-1 font-bold text-helixed-navy">{fact.statement}</p>
                      <p className="mt-1 text-sm text-slate-500">Evidence: {fact.evidence}</p>
                    </article>
                  ))}
                  {!data.facts.length ? (
                    <p className="text-sm text-slate-500">
                      Not enough recorded evidence to describe a factual pattern.
                    </p>
                  ) : null}
                </div>
              </DashboardCard>

              <DashboardCard title="Upcoming 7 days">
                <Upcoming title="Tasks" items={data.upcoming.tasks} />
                <Upcoming title="Exams" items={data.upcoming.exams} />
                <Upcoming title="Schedule" items={data.upcoming.schedule} />
                {!data.upcoming.tasks.length &&
                !data.upcoming.exams.length &&
                !data.upcoming.schedule.length ? (
                  <p className="text-sm text-slate-500">No upcoming items are recorded.</p>
                ) : null}
              </DashboardCard>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-3">
              <DashboardCard title="Recorded subject progress">
                <div className="space-y-3">
                  {data.subjects.map((subject) => (
                    <div key={subject.id}>
                      <div className="flex justify-between text-sm">
                        <b className="text-helixed-navy">{subject.name}</b>
                        <span>{subject.progress}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-blue-50">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!data.subjects.length ? (
                    <p className="text-sm text-slate-500">No subject progress is recorded.</p>
                  ) : null}
                </div>
              </DashboardCard>
              <DashboardCard title="Attendance records">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Known" value={data.attendance.knownSessions} />
                  <Metric label="Missing" value={data.attendance.missingSessions} />
                  <Metric label="Present" value={data.attendance.present} />
                  <Metric label="Absent" value={data.attendance.absent} />
                </dl>
              </DashboardCard>
              <DashboardCard title="Task records">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Completed" value={data.tasks.completed} />
                  <Metric label="Overdue" value={data.tasks.overdue} />
                  <Metric label="Upcoming" value={data.tasks.upcoming} />
                  <Metric label="Open, undated" value={data.tasks.open} />
                </dl>
              </DashboardCard>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function EvidenceCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const colors = {
    blue: 'border-blue-100 bg-blue-50',
    emerald: 'border-emerald-100 bg-emerald-50',
    amber: 'border-amber-100 bg-amber-50',
    violet: 'border-violet-100 bg-violet-50',
  };
  return (
    <article className={`rounded-2xl border p-5 ${colors[tone]}`}>
      <p className="text-sm font-bold text-slate-600">{title}</p>
      <p className="mt-2 text-xl font-black text-helixed-navy">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

function Upcoming({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string; at: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      {items.map((item) => (
        <div key={item.id} className="mt-2 flex justify-between gap-3 text-sm">
          <span className="font-semibold text-helixed-navy">{item.title}</span>
          <span className="whitespace-nowrap text-slate-400">{shortDate(item.at)}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-black text-helixed-navy">{value}</dd>
    </div>
  );
}
