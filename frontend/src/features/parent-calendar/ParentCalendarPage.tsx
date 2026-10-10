import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type View = 'overview' | 'day' | 'week' | 'month';
type Child = { id: string; displayName: string | null };
type Event = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  startsAt: string;
  endsAt: string | null;
  color: string;
};
type CalendarResponse = {
  children?: Child[];
  child: { id: string; displayName: string };
  events: Event[];
  hasCalendarData?: boolean;
};
const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * 86400000);
const fmt = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
const time = (date: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
function period(view: View, anchor: Date) {
  const current = day(anchor);
  if (view === 'day') return [current, addDays(current, 1)] as const;
  if (view === 'month')
    return [
      new Date(current.getFullYear(), current.getMonth(), 1),
      new Date(current.getFullYear(), current.getMonth() + 1, 1),
    ] as const;
  const monday = addDays(current, -((current.getDay() + 6) % 7));
  return [monday, addDays(monday, 7)] as const;
}
function days(view: View, from: Date, to: Date) {
  return Array.from(
    {
      length:
        view === 'month'
          ? Math.round((to.getTime() - from.getTime()) / 86400000)
          : view === 'day'
            ? 1
            : 7,
    },
    (_, index) => addDays(from, index),
  );
}
function EventCard({ event, childId }: { event: Event; childId: string }) {
  return (
    <Link
      to={`/parent/calendar/event/${encodeURIComponent(event.id)}?childId=${childId}`}
      className="block rounded-lg border-l-4 border-blue-500 bg-blue-50 p-2 text-xs text-helixed-navy"
    >
      <b>
        {time(event.startsAt)} · {event.title}
      </b>
      <p className="mt-1 text-slate-500">{event.detail}</p>
    </Link>
  );
}

export function ParentCalendarPage({
  view = 'overview',
  childContextId,
}: {
  view?: View;
  childContextId?: string;
}) {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const [canonicalView, setCanonicalView] = useState<View>(view);
  const [anchor, setAnchor] = useState(() => new Date());
  const activeView = childContextId ? canonicalView : view;
  const [from, to] = period(activeView, anchor);
  const query = useQuery({
    queryKey: ['parent-calendar', childContextId ?? childId, activeView, from.toISOString()],
    queryFn: () =>
      apiRequest<CalendarResponse>(
        childContextId
          ? `/parent/children/${childContextId}/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
          : `/parent/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}${childId ? `&childId=${childId}` : ''}`,
        { accessToken: accessToken! },
      ),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <p className="p-6">Loading calendar…</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-rose-600">Calendar is unavailable.</p>;
  const data = query.data;
  const gridDays = days(activeView, from, to);
  const shift =
    activeView === 'month' ? 31 : activeView === 'week' || activeView === 'overview' ? 7 : 1;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white p-5">
        <b className="text-2xl text-helixed-navy">Parent Calendar</b>
      </header>
      <div className="mx-auto max-w-6xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Child calendar</p>
            <h1 className="text-3xl font-black text-helixed-navy">
              {data.child.displayName}'s calendar
            </h1>
          </div>
          {childContextId ? (
            <Link
              to={`/parent/children/${data.child.id}`}
              className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
            >
              ← Child overview
            </Link>
          ) : (
            <select
              aria-label="Child"
              value={data.child.id}
              onChange={(event) => setChildId(event.target.value)}
              className="rounded-xl border border-blue-100 bg-white p-3"
            >
              {(data.children ?? []).map((child) => (
                <option key={child.id} value={child.id}>
                  {child.displayName ?? 'Student'}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous period"
              onClick={() => setAnchor((value) => addDays(value, -shift))}
              className="rounded-lg border bg-white px-3 py-2"
            >
              ←
            </button>
            <b className="text-helixed-navy">
              {activeView === 'month'
                ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
                    from,
                  )
                : `${fmt(from)} – ${fmt(addDays(to, -1))}`}
            </b>
            <button
              aria-label="Next period"
              onClick={() => setAnchor((value) => addDays(value, shift))}
              className="rounded-lg border bg-white px-3 py-2"
            >
              →
            </button>
          </div>
          <nav className="flex rounded-xl border border-blue-100 bg-white p-1">
            {(['day', 'week', 'month'] as const).map((item) =>
              childContextId ? (
                <button
                  key={item}
                  onClick={() => setCanonicalView(item)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === item ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  {item}
                </button>
              ) : (
                <Link
                  key={item}
                  to={`/parent/calendar/${item}`}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === item ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  {item}
                </Link>
              ),
            )}
          </nav>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <DashboardCard
            title={
              activeView === 'overview'
                ? 'Calendar overview'
                : `${activeView[0].toUpperCase() + activeView.slice(1)} view`
            }
          >
            <div
              className={`grid gap-2 ${activeView === 'month' ? 'grid-cols-7' : 'md:grid-cols-7'}`}
            >
              {gridDays.map((value) => {
                const items = data.events.filter(
                  (event) => new Date(event.startsAt).toDateString() === value.toDateString(),
                );
                return (
                  <div
                    key={value.toISOString()}
                    className="min-h-32 rounded-xl border border-slate-100 p-2"
                  >
                    <p className="mb-2 text-xs font-bold text-slate-500">
                      {activeView === 'month' ? value.getDate() : fmt(value)}
                    </p>
                    <div className="space-y-1">
                      {items.map((event) => (
                        <EventCard key={event.id} event={event} childId={data.child.id} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {data.events.length === 0 ? (
              <p className="py-5 text-sm text-slate-500">
                {data.hasCalendarData
                  ? 'No parent-visible events in this period.'
                  : 'No calendar data is available for this child.'}
              </p>
            ) : null}
          </DashboardCard>
          <aside className="space-y-4">
            <DashboardCard title="Upcoming">
              <div className="space-y-2">
                {data.events.slice(0, 5).map((event) => (
                  <EventCard key={event.id} event={event} childId={data.child.id} />
                ))}
              </div>
            </DashboardCard>
            <DashboardCard title="Calendar visibility">
              <p className="text-sm text-slate-500">
                Classes, task deadlines, exams, and dated activities are shown from their canonical
                records.
              </p>
            </DashboardCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function ParentChildCalendarPage() {
  const { id } = useParams();
  return <ParentCalendarPage childContextId={id} />;
}

export function ParentCalendarEventPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const childId = new URLSearchParams(location.search).get('childId');
  const query = useQuery({
    queryKey: ['parent-calendar-event', id, childId],
    queryFn: () =>
      apiRequest<CalendarResponse & { event: Event }>(
        `/parent/calendar/event/${encodeURIComponent(id)}${childId ? `?childId=${childId}` : ''}`,
        { accessToken: accessToken! },
      ),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading) return <p className="p-6">Loading event…</p>;
  if (query.isError || !query.data) return <p className="p-6 text-rose-600">Event unavailable.</p>;
  const { child, event } = query.data;
  return (
    <main className="min-h-screen bg-slate-50 p-5">
      <div className="mx-auto max-w-5xl">
        <Link
          to={`/parent/calendar${childId ? `?childId=${childId}` : ''}`}
          className="text-sm font-semibold text-blue-600"
        >
          ← Back to calendar
        </Link>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <DashboardCard title={event.title}>
            <p className="text-sm text-slate-500">
              {child.displayName}'s {event.type} · {event.detail}
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
          <DashboardCard title="Read-only">
            <p className="text-sm text-slate-500">
              This event remains owned by its canonical source and cannot be changed here.
            </p>
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}
