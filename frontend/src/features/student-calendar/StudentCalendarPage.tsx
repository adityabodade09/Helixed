import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../auth/useAuth';
import { StudentShell } from '../student-dashboard/StudentShell';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { calendarApi, type CalendarEvent } from './studentCalendar.api';
type View = 'overview' | 'day' | 'week' | 'month';
const startDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const add = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const fmt = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
const time = (x: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(x));
function State({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-600">
      {children}
    </main>
  );
}
function Frame({ children }: PropsWithChildren) {
  const { user } = useAuth();
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">{children}</div>
    </StudentShell>
  );
}
function range(view: View) {
  const today = startDay(new Date());
  if (view === 'day') return [today, add(today, 1)] as const;
  if (view === 'month')
    return [
      new Date(today.getFullYear(), today.getMonth(), 1),
      new Date(today.getFullYear(), today.getMonth() + 1, 1),
    ] as const;
  const monday = add(today, ((today.getDay() + 6) % 7) * -1);
  return [monday, add(monday, 7)] as const;
}
function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <Link
      to={`/student/calendar/event/${encodeURIComponent(event.id)}`}
      className={`block rounded-lg border-l-4 bg-${event.color}-50 p-2 text-xs text-helixed-navy hover:shadow-sm`}
    >
      <b>
        {time(event.startsAt)} · {event.title}
      </b>
      <p className="mt-1 text-slate-500">{event.detail}</p>
    </Link>
  );
}
export function StudentCalendarPage({ view = 'overview' }: { view?: View }) {
  const { accessToken } = useAuth();
  const [from, to] = range(view);
  const query = useQuery({
    queryKey: ['student-calendar', view, from.toISOString()],
    queryFn: () => calendarApi.list(accessToken!, from, to),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <State>Loading calendar…</State>;
  if (query.isError)
    return (
      <State>
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Calendar is unavailable</h1>
          <button
            onClick={() => query.refetch()}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white"
          >
            Try again
          </button>
        </div>
      </State>
    );
  const events = query.data ?? [];
  const days = Array.from({ length: view === 'month' ? 31 : 7 }, (_, i) => add(from, i));
  return (
    <Frame>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-700">Student › Calendar</p>
          <h1 className="mt-2 text-3xl font-black text-helixed-navy">
            {view === 'day'
              ? `Today · ${fmt(from)}`
              : view === 'month'
                ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
                    from,
                  )
                : `${fmt(from)} – ${fmt(add(to, -1))}`}
          </h1>
          <p className="mt-1 text-slate-500">Everything happening around your student journey.</p>
        </div>
        <nav className="flex rounded-xl border border-blue-100 bg-white p-1">
          {(['day', 'week', 'month'] as const).map((item) => (
            <Link
              key={item}
              to={`/student/calendar/${item}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === item ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
              {item}
            </Link>
          ))}
        </nav>
      </section>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <DashboardCard
          title={view === 'overview' ? 'Calendar' : `${view[0].toUpperCase() + view.slice(1)} view`}
        >
          <div className={`grid gap-2 ${view === 'month' ? 'grid-cols-7' : 'md:grid-cols-7'}`}>
            {days.map((day) => {
              const items = events.filter(
                (event) => new Date(event.startsAt).toDateString() === day.toDateString(),
              );
              return (
                <div
                  key={day.toISOString()}
                  className="min-h-32 rounded-xl border border-slate-100 p-2"
                >
                  <p className="mb-2 text-xs font-bold text-slate-500">
                    {view === 'month' ? day.getDate() : fmt(day)}
                  </p>
                  <div className="space-y-1">
                    {items.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {events.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">No events in this period.</p>
          ) : null}
        </DashboardCard>
        <aside className="space-y-4">
          <DashboardCard title="Today">
            <div className="space-y-2">
              {events.slice(0, 5).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </DashboardCard>
          <DashboardCard title="Calendar filters">
            <p className="text-sm text-slate-500">
              Classes, deadlines, exams, and activities are shown from their canonical records.
            </p>
          </DashboardCard>
        </aside>
      </div>
    </Frame>
  );
}
export function StudentCalendarEventPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-calendar', 'event', id],
    queryFn: () => calendarApi.get(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading) return <State>Loading event…</State>;
  if (query.isError || !query.data) return <State>Event unavailable.</State>;
  const event = query.data;
  return (
    <Frame>
      <Link to="/student/calendar" className="text-sm font-semibold text-blue-600">
        ← Back to calendar
      </Link>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <DashboardCard title={event.title}>
          <p className="text-sm text-slate-500">
            {event.type} · {event.detail}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <p>
              <b className="text-helixed-navy">Date</b>
              <br />
              {fmt(new Date(event.startsAt))}
            </p>
            <p>
              <b className="text-helixed-navy">Time</b>
              <br />
              {time(event.startsAt)}
              {event.endsAt ? ` – ${time(event.endsAt)}` : ''}
            </p>
          </div>
        </DashboardCard>
        <DashboardCard title="Event status">
          <p className="text-sm text-slate-500">
            This is a read-only calendar projection of its canonical source.
          </p>
        </DashboardCard>
      </div>
    </Frame>
  );
}
