import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
type Academic = {
  children?: { id: string; displayName: string | null }[];
  child: { id: string; displayName: string };
  subjects: { id: string; name: string; progress: number }[];
  tasks: { id: string; title: string; completedAt: string | null }[];
  exams: { id: string; title: string; startsAt: string }[];
  schedule: { id: string; title: string; detail: string | null; startsAt: string }[];
};
export function ParentAcademicsPage({ childContextId }: { childContextId?: string }) {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const q = useQuery({
    queryKey: ['parent-academics', childContextId ?? childId],
    queryFn: () =>
      apiRequest<Academic>(
        childContextId
          ? `/parent/children/${childContextId}/academics`
          : `/parent/academics${childId ? `?childId=${childId}` : ''}`,
        { accessToken: accessToken! },
      ),
    enabled: !!accessToken,
  });
  if (q.isLoading) return <p className="p-6">Loading academics…</p>;
  if (q.isError || !q.data) return <p className="p-6 text-rose-600">Academics are unavailable.</p>;
  const d = q.data;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white p-5">
        <b className="text-2xl text-helixed-navy">Parent Academics</b>
      </header>
      <div className="mx-auto max-w-6xl p-5">
        {childContextId ? (
          <Link
            to={`/parent/children/${d.child.id}`}
            className="text-sm font-semibold text-blue-700"
          >
            ← {d.child.displayName}'s overview
          </Link>
        ) : (
          <select
            aria-label="Child"
            value={d.child.id}
            onChange={(e) => setChildId(e.target.value)}
            className="rounded-xl border p-3"
          >
            {(d.children ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        )}
        <h1 className="mt-5 text-3xl font-black text-helixed-navy">
          {d.child.displayName}'s academics
        </h1>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DashboardCard title="Subjects and progress">
            {d.subjects.length
              ? d.subjects.map((s) => (
                  <p key={s.id}>
                    {s.name} · {s.progress}%
                  </p>
                ))
              : 'No academic progress yet.'}
          </DashboardCard>
          <DashboardCard title="Tasks">
            {d.tasks.length
              ? d.tasks.map((t) => (
                  <p key={t.id}>
                    {t.title} · {t.completedAt ? 'Complete' : 'Open'}
                  </p>
                ))
              : 'No tasks yet.'}
          </DashboardCard>
          <DashboardCard title="Exams">
            {d.exams.length
              ? d.exams.map((e) => (
                  <p key={e.id}>
                    {e.title} · {new Date(e.startsAt).toLocaleDateString()}
                  </p>
                ))
              : 'No exams yet.'}
          </DashboardCard>
          <DashboardCard title="Schedule">
            {d.schedule.length
              ? d.schedule.map((s) => (
                  <p key={s.id}>
                    {s.title} · {s.detail ?? ''}
                  </p>
                ))
              : 'No schedule yet.'}
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}

export function ParentChildAcademicsPage() {
  const { id } = useParams();
  return <ParentAcademicsPage childContextId={id} />;
}
