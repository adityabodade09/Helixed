import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { TeacherShell } from './TeacherShell';
import { teacherDashboardApi, type TeacherSession } from './teacherDashboard.api';

const dateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export function TeacherDashboardPage() {
  const { accessToken, user } = useAuth();
  const query = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => teacherDashboardApi.get(accessToken!),
    enabled: !!accessToken,
  });
  const teacherName = query.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        {query.isLoading ? <p>Loading Teacher dashboard…</p> : null}
        {query.isError ? (
          <p className="rounded-2xl bg-rose-50 p-5 text-rose-700">
            Teacher dashboard access is unavailable.
          </p>
        ) : null}
        {query.data ? <TeacherDashboardView dashboard={query.data} /> : null}
      </div>
    </TeacherShell>
  );
}

function TeacherDashboardView({
  dashboard,
}: {
  dashboard: Awaited<ReturnType<typeof teacherDashboardApi.get>>;
}) {
  return (
    <>
      <section className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-black text-helixed-navy md:text-4xl">Teacher Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Your assigned teaching context and evidence-backed operational overview.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-right">
            <p className="font-bold text-helixed-navy">{dashboard.teacher.displayName}</p>
            <p className="text-sm text-slate-500">{dashboard.school.name}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Assigned classes" value={dashboard.summary.assignedClasses} tone="blue" />
        <Metric
          title="Authorized students"
          value={dashboard.summary.authorizedStudents}
          tone="emerald"
        />
        <Metric
          title="Open student tasks"
          value={dashboard.summary.openStudentTasks}
          tone="amber"
        />
        <Metric
          title="Attendance pending"
          value={dashboard.summary.attendanceSessionsPending}
          tone="violet"
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <DashboardCard title="My assigned classes">
            {dashboard.classes.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {dashboard.classes.map((schoolClass) => (
                  <article key={schoolClass.id} className="rounded-xl border border-blue-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-helixed-navy">{schoolClass.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {schoolClass.sessionSubjects.length
                            ? schoolClass.sessionSubjects.join(' · ')
                            : 'No scheduled subjects recorded'}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                        Active
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <p className="rounded-lg bg-slate-50 p-2">
                        <b>{schoolClass.studentCount}</b> students
                      </p>
                      <p className="rounded-lg bg-slate-50 p-2">
                        <b>{schoolClass.openTaskCount}</b> open tasks
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-slate-500">
                No active class assignments are available for this Teacher account.
              </p>
            )}
          </DashboardCard>

          <DashboardCard title="Recent official attendance sessions">
            {dashboard.recentSessions.length ? (
              <div className="divide-y divide-slate-100">
                {dashboard.recentSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No completed attendance sessions recorded.</p>
            )}
          </DashboardCard>
        </div>

        <aside className="space-y-5">
          <DashboardCard title="Upcoming class sessions">
            {dashboard.upcomingSessions.length ? (
              dashboard.upcomingSessions.map((session) => (
                <SessionRow key={session.id} session={session} compact />
              ))
            ) : (
              <p className="text-sm text-slate-500">No upcoming official sessions recorded.</p>
            )}
          </DashboardCard>
          <DashboardCard title="Operational boundary">
            <p className="text-sm leading-6 text-slate-600">
              Counts include only active assigned classes. Missing attendance remains unknown—not
              absent—and this dashboard does not expose private Student or Parent information.
            </p>
          </DashboardCard>
        </aside>
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
  tone: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function SessionRow({ session, compact = false }: { session: TeacherSession; compact?: boolean }) {
  return (
    <article className="py-3 first:pt-0 last:pb-0">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-semibold text-helixed-navy">
            {session.className} · {session.subjectName}
          </p>
          <p className="text-xs text-slate-500">{dateTime(session.startsAt)}</p>
        </div>
        <span className="text-xs font-semibold text-blue-700">{session.state}</span>
      </div>
      {!compact ? (
        <p className="mt-2 text-sm text-slate-600">
          {session.attendance.knownRecords} known · {session.attendance.missingRecords} missing ·{' '}
          {session.attendance.absentRecords} absent
        </p>
      ) : null}
    </article>
  );
}
