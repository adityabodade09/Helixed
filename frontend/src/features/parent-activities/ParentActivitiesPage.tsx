import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type Child = { id: string; displayName: string | null };
type Activity = {
  id: string;
  title: string;
  category: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  startedAt: string | null;
  occursAt: string | null;
  organization: string | null;
  _count: { progressEntries: number; milestones: number; certificates: number };
};
type Certificate = {
  id: string;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  state: string;
};
type ActivitiesResponse = {
  children?: Child[];
  child: { id: string; displayName: string };
  activities: Activity[];
  certificates: Certificate[];
};
type ActivityResponse = {
  children: Child[];
  child: { id: string; displayName: string };
  activity: Activity & {
    endedAt: string | null;
    progressEntries: { id: string; title: string; occurredAt: string }[];
    milestones: { id: string; title: string; progress: number; completedAt: string | null }[];
    certificates: Certificate[];
  };
};
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : 'Not set');

function ChildSelector({
  children,
  childId,
  onChange,
}: {
  children: Child[];
  childId: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      aria-label="Child"
      value={childId}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-helixed-navy"
    >
      {children.map((child) => (
        <option key={child.id} value={child.id}>
          {child.displayName ?? 'Student'}
        </option>
      ))}
    </select>
  );
}

export function ParentActivitiesPage({ childContextId }: { childContextId?: string }) {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const query = useQuery({
    queryKey: ['parent-activities', childContextId ?? childId],
    queryFn: () =>
      apiRequest<ActivitiesResponse>(
        childContextId
          ? `/parent/children/${childContextId}/activities`
          : `/parent/activities${childId ? `?childId=${childId}` : ''}`,
        { accessToken: accessToken! },
      ),
    enabled: !!accessToken,
  });
  if (query.isLoading) return <p className="p-6">Loading activities…</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-rose-600">Activities are unavailable.</p>;
  const data = query.data;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white p-5">
        <b className="text-2xl text-helixed-navy">Parent Activities</b>
      </header>
      <div className="mx-auto max-w-6xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Child activities</p>
            <h1 className="text-3xl font-black text-helixed-navy">
              {data.child.displayName}'s activities
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
            <ChildSelector
              children={data.children ?? []}
              childId={data.child.id}
              onChange={setChildId}
            />
          )}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <DashboardCard title="Active activities">
            <p className="text-3xl font-black text-helixed-navy">
              {data.activities.filter((activity) => activity.status === 'ACTIVE').length}
            </p>
          </DashboardCard>
          <DashboardCard title="Activity updates">
            <p className="text-3xl font-black text-helixed-navy">
              {data.activities.reduce(
                (total, activity) => total + activity._count.progressEntries,
                0,
              )}
            </p>
          </DashboardCard>
          <DashboardCard title="Milestones">
            <p className="text-3xl font-black text-helixed-navy">
              {data.activities.reduce((total, activity) => total + activity._count.milestones, 0)}
            </p>
          </DashboardCard>
          <DashboardCard title="Certificates">
            <p className="text-3xl font-black text-helixed-navy">{data.certificates.length}</p>
          </DashboardCard>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <DashboardCard title="Current activities">
            <div className="grid gap-3 md:grid-cols-2">
              {data.activities.length ? (
                data.activities.map((activity) => (
                  <Link
                    key={activity.id}
                    to={`/parent/activities/${activity.id}?childId=${data.child.id}`}
                    className="rounded-xl border border-blue-100 p-4 transition hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-helixed-navy">{activity.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {activity.category ?? 'Activity'} ·{' '}
                          {activity.organization ?? 'Independent'}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {activity.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {activity._count.milestones} milestones · {activity._count.progressEntries}{' '}
                      updates · Since {date(activity.startedAt)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">No parent-visible activities yet.</p>
              )}
            </div>
          </DashboardCard>
          <aside className="space-y-4">
            <DashboardCard title="Recent certificates">
              {data.certificates.length ? (
                data.certificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="border-b border-slate-100 py-3 last:border-0"
                  >
                    <p className="font-semibold text-helixed-navy">{certificate.title}</p>
                    <p className="text-xs text-slate-500">
                      {certificate.issuer ?? 'Issuer not set'} · {date(certificate.issuedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No certificates yet.</p>
              )}
            </DashboardCard>
            <DashboardCard title="How you can support">
              <p className="text-sm text-slate-600">
                Encourage consistent participation and discuss upcoming activity commitments
                together.
              </p>
            </DashboardCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function ParentChildActivitiesPage() {
  const { id } = useParams();
  return <ParentActivitiesPage childContextId={id} />;
}

export function ParentActivityDetailPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const childId = new URLSearchParams(location.search).get('childId');
  const query = useQuery({
    queryKey: ['parent-activities', id, childId],
    queryFn: () =>
      apiRequest<ActivityResponse>(
        `/parent/activities/${id}${childId ? `?childId=${childId}` : ''}`,
        { accessToken: accessToken! },
      ),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading) return <p className="p-6">Loading activity…</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-rose-600">Activity is unavailable.</p>;
  const { child, activity } = query.data;
  return (
    <main className="min-h-screen bg-slate-50 p-5">
      <div className="mx-auto max-w-5xl">
        <Link
          to={`/parent/activities${childId ? `?childId=${childId}` : ''}`}
          className="text-sm font-semibold text-blue-600"
        >
          ← Back to activities
        </Link>
        <h1 className="mt-4 text-3xl font-black text-helixed-navy">{activity.title}</h1>
        <p className="mt-1 text-slate-500">
          {child.displayName}'s {activity.category ?? 'activity'} ·{' '}
          {activity.organization ?? 'Independent'}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DashboardCard title="Progress updates">
            {activity.progressEntries.length ? (
              activity.progressEntries.map((entry) => (
                <div key={entry.id} className="border-l-2 border-blue-500 py-1 pl-3">
                  <p className="font-semibold text-helixed-navy">{entry.title}</p>
                  <p className="text-xs text-slate-500">{date(entry.occurredAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No parent-visible progress updates yet.</p>
            )}
          </DashboardCard>
          <DashboardCard title="Milestones">
            {activity.milestones.length ? (
              activity.milestones.map((milestone) => (
                <div key={milestone.id} className="py-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-helixed-navy">{milestone.title}</span>
                    <span>{milestone.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-blue-50">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No milestones yet.</p>
            )}
          </DashboardCard>
          <DashboardCard title="Certificates">
            {activity.certificates.length ? (
              activity.certificates.map((certificate) => (
                <div key={certificate.id} className="border-b border-slate-100 py-2 last:border-0">
                  <p className="font-semibold text-helixed-navy">{certificate.title}</p>
                  <p className="text-xs text-slate-500">
                    {certificate.issuer ?? 'Issuer not set'} · {date(certificate.issuedAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No certificates yet.</p>
            )}
          </DashboardCard>
          <DashboardCard title="Participation">
            {' '}
            <p className="text-sm text-slate-600">
              Started {date(activity.startedAt)}
              {activity.endedAt ? ` · Ended ${date(activity.endedAt)}` : ''}.
            </p>
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}
