import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { AcademyShell } from './AcademyShell';
import { academyDashboardApi, type AcademyDashboard } from './academyDashboard.api';

export function AcademyDashboardPage() {
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['academy-dashboard'],
    queryFn: () => academyDashboardApi.get(accessToken!),
    enabled: !!accessToken,
  });

  return (
    <AcademyShell academyName={query.data?.academy.name ?? 'Academy'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        {query.isLoading ? <p>Loading Academy dashboard…</p> : null}
        {query.isError ? (
          <p className="rounded-2xl bg-rose-50 p-5 text-rose-700">
            Academy dashboard access is unavailable.
          </p>
        ) : null}
        {query.data ? <DashboardView dashboard={query.data} /> : null}
      </div>
    </AcademyShell>
  );
}

function DashboardView({ dashboard }: { dashboard: AcademyDashboard }) {
  return (
    <>
      <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">Academy operations</p>
        <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
          {dashboard.academy.name}
        </h1>
        <p className="mt-2 text-slate-600">
          A factual overview of current Academy enrollments, batches, and coach assignments.
        </p>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric title="Enrolled students" value={dashboard.summary.enrolledStudents} tone="blue" />
        <Metric title="Batches" value={dashboard.summary.batches} tone="violet" />
        <Metric title="Assigned coaches" value={dashboard.summary.assignedCoaches} tone="emerald" />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <DashboardCard title="Academy batches">
          {dashboard.batches.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.batches.map((batch) => (
                <article key={batch.id} className="rounded-xl border border-blue-100 p-4">
                  <h2 className="font-bold text-helixed-navy">{batch.name}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <p className="rounded-lg bg-slate-50 p-2">
                      <b>{batch.studentCount}</b> students
                    </p>
                    <p className="rounded-lg bg-slate-50 p-2">
                      <b>{batch.coachCount}</b> coaches
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-6 text-sm text-slate-500">
              No Academy batches are currently recorded.
            </p>
          )}
        </DashboardCard>

        <DashboardCard title="Data boundary">
          <p className="text-sm leading-6 text-slate-600">
            This dashboard contains Academy-owned enrollment and batch facts only. School marks,
            school attendance, private Student information, and predictive scores are not included.
          </p>
        </DashboardCard>
      </div>
    </>
  );
}

function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'blue' | 'violet' | 'emerald';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
