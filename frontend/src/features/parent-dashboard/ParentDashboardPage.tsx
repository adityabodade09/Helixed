import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
type Dashboard = {
  children: { id: string; displayName: string | null }[];
  child: { id: string; displayName: string };
  subjects: { id: string; name: string; progress: number }[];
  tasks: { id: string; title: string }[];
  schedule: { id: string; title: string }[];
  activities: { id: string; title: string }[];
};
export function ParentDashboardPage() {
  const { accessToken, user } = useAuth();
  const [childId, setChildId] = useState<string>();
  const q = useQuery({
    queryKey: ['parent-dashboard', childId],
    queryFn: () =>
      apiRequest<Dashboard>(`/parent${childId ? `?childId=${childId}` : ''}`, {
        accessToken: accessToken!,
      }),
    enabled: !!accessToken,
  });
  if (q.isLoading) return <p className="p-6">Loading child dashboard…</p>;
  if (q.isError || !q.data) return <p className="p-6">Dashboard unavailable.</p>;
  const d = q.data;
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-white p-5">
        <b className="text-2xl text-helixed-navy">Helixed Parent</b>
        <span>{user?.displayName}</span>
      </header>
      <div className="mx-auto max-w-6xl p-5">
        <select
          aria-label="Child"
          value={d.child.id}
          onChange={(e) => setChildId(e.target.value)}
          className="rounded-xl border p-3"
        >
          {d.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        <h1 className="mt-5 text-3xl font-black text-helixed-navy">
          {d.child.displayName}'s overview
        </h1>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardCard title="Academic progress">
            {d.subjects.map((s) => (
              <p key={s.id}>
                {s.name} · {s.progress}%
              </p>
            ))}
          </DashboardCard>
          <DashboardCard title="Upcoming tasks">
            {d.tasks.map((t) => (
              <p key={t.id}>{t.title}</p>
            ))}
          </DashboardCard>
          <DashboardCard title="Schedule">
            {d.schedule.map((s) => (
              <p key={s.id}>{s.title}</p>
            ))}
          </DashboardCard>
          <DashboardCard title="Activities">
            {d.activities.map((a) => (
              <p key={a.id}>{a.title}</p>
            ))}
          </DashboardCard>
        </div>
      </div>
    </main>
  );
}
