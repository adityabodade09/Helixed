import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type TaskState = 'COMPLETED' | 'OVERDUE' | 'UPCOMING' | 'OPEN';
type TasksResponse = {
  child: { id: string; displayName: string | null };
  summary: { total: number; completed: number; overdue: number; upcoming: number; open: number };
  tasks: {
    id: string;
    title: string;
    subject: string | null;
    dueAt: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    completedAt: string | null;
    state: TaskState;
  }[];
};

const labels: Record<TaskState, string> = {
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  UPCOMING: 'Upcoming',
  OPEN: 'Open',
};
const tones: Record<TaskState, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  UPCOMING: 'bg-amber-100 text-amber-700',
  OPEN: 'bg-slate-100 text-slate-700',
};
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : 'No deadline set';

export function ParentTasksPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<'ALL' | TaskState>('ALL');
  const query = useQuery({
    queryKey: ['parent-child-tasks', id],
    queryFn: () =>
      apiRequest<TasksResponse>(`/parent/children/${id}/tasks`, { accessToken: accessToken! }),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading) return <main className="min-h-screen bg-slate-50 p-6">Loading tasks…</main>;
  if (query.isError || !query.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Tasks are unavailable in this authorized child context.
      </main>
    );
  const { child, summary, tasks } = query.data;
  const visibleTasks = filter === 'ALL' ? tasks : tasks.filter((task) => task.state === filter);
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link to={`/parent/children/${child.id}`} className="text-sm font-semibold text-blue-700">
          ← {child.displayName ?? 'Student'}’s overview
        </Link>
        <header className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">
            Children › {child.displayName ?? 'Student'} › Tasks
          </p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
            {child.displayName ?? 'Student'}’s tasks
          </h1>
          <p className="mt-2 text-slate-600">
            A read-only view of current schoolwork and personal tasks.
          </p>
        </header>
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total tasks', summary.total],
            ['Completed', summary.completed],
            ['Upcoming', summary.upcoming],
            ['Overdue', summary.overdue],
          ].map(([label, value]) => (
            <DashboardCard key={String(label)} title={String(label)}>
              <p className="text-3xl font-black text-helixed-navy">{value}</p>
            </DashboardCard>
          ))}
        </section>
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-helixed-navy">All tasks</h2>
            <div aria-label="Task filters" className="flex flex-wrap gap-2">
              {(['ALL', 'UPCOMING', 'OVERDUE', 'COMPLETED'] as const).map((state) => (
                <button
                  key={state}
                  onClick={() => setFilter(state)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${filter === state ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}
                >
                  {state === 'ALL' ? 'All' : labels[state]}
                </button>
              ))}
            </div>
          </div>
          {visibleTasks.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="p-3">Task</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Due date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-helixed-navy">{task.title}</td>
                      <td className="p-3 text-slate-600">{task.subject ?? 'General'}</td>
                      <td className="p-3 text-slate-600">{task.priority.toLowerCase()}</td>
                      <td className="p-3 text-slate-600">{formatDate(task.dueAt)}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${tones[task.state]}`}
                        >
                          {labels[task.state]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-slate-500">
              {tasks.length
                ? 'No tasks match this filter.'
                : 'No tasks are available for this child.'}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
