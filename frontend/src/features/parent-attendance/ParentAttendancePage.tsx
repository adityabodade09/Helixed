import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type Summary = {
  scheduledSessions: number;
  knownSessions: number;
  missingSessions: number;
  present: number;
  absent: number;
  late: number;
  partial: number;
  presentRate: number | null;
};
type Attendance = {
  child: { id: string; displayName: string | null };
  summary: Summary;
  subjects: Array<Summary & { subject: string }>;
  sessions: {
    id: string;
    subject: string;
    startsAt: string;
    endsAt: string;
    state: 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;
  }[];
};

const labels = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  PARTIAL: 'Partial',
} as const;

export function ParentAttendancePage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['parent-attendance', id],
    queryFn: () =>
      apiRequest<Attendance>(`/parent/children/${id}/attendance`, {
        accessToken: accessToken!,
      }),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading) return <p className="p-6">Loading attendance…</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-rose-600">Attendance is unavailable.</p>;
  const data = query.data;
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/parent/children/${data.child.id}`}
          className="text-sm font-semibold text-blue-700"
        >
          ← {data.child.displayName ?? 'Student'}'s overview
        </Link>
        <header className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Verified child context</p>
          <h1 className="mt-1 text-4xl font-black text-helixed-navy">Attendance</h1>
          <p className="mt-1 text-lg font-semibold text-blue-700">
            {data.child.displayName ?? 'Student'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Official records received from scheduled class sessions.
          </p>
        </header>

        {data.summary.scheduledSessions === 0 ? (
          <div className="mt-5">
            <DashboardCard title="No attendance data">
              <p className="text-sm text-slate-600">
                No official attendance sessions are available for this child.
              </p>
            </DashboardCard>
          </div>
        ) : (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [
                  'Known attendance',
                  data.summary.presentRate === null ? '—' : `${data.summary.presentRate}%`,
                ],
                ['Present', data.summary.present],
                ['Absent', data.summary.absent],
                ['Late', data.summary.late],
                ['Missing', data.summary.missingSessions],
              ].map(([label, value]) => (
                <DashboardCard key={String(label)} title={String(label)}>
                  <p className="text-3xl font-black text-helixed-navy">{value}</p>
                </DashboardCard>
              ))}
            </section>
            <p className="mt-3 text-xs text-slate-500">
              Percentage uses {data.summary.knownSessions} sessions with official records. Missing
              records are not counted as absent.
            </p>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <DashboardCard title="Attendance by subject">
                <div className="space-y-4">
                  {data.subjects.map((subject) => (
                    <div key={subject.subject}>
                      <div className="flex justify-between text-sm">
                        <b>{subject.subject}</b>
                        <span>
                          {subject.presentRate === null
                            ? 'No known record'
                            : `${subject.presentRate}%`}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-blue-50">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${subject.presentRate ?? 0}%` }}
                        />
                      </div>
                      {subject.missingSessions ? (
                        <p className="mt-1 text-xs text-amber-700">
                          {subject.missingSessions} record awaiting official status
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </DashboardCard>
              <DashboardCard title="Attendance history">
                <div className="space-y-2">
                  {data.sessions.map((session) => (
                    <article
                      key={session.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div>
                        <p className="font-semibold text-helixed-navy">{session.subject}</p>
                        <p className="text-xs text-slate-500">
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                            new Date(session.startsAt),
                          )}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${session.state === null ? 'bg-slate-100 text-slate-600' : session.state === 'ABSENT' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
                      >
                        {session.state ? labels[session.state] : 'Awaiting official record'}
                      </span>
                    </article>
                  ))}
                </div>
              </DashboardCard>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
