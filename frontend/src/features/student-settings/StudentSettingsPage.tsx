import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../../services/api/apiClient';
import { StudentShell } from '../student-dashboard/StudentShell';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
export function StudentSettingsPage() {
  const { accessToken, user, logoutAll } = useAuth();
  const q = useQuery({
    queryKey: ['student-settings'],
    queryFn: () =>
      apiRequest<{
        sessions: {
          id: string;
          createdAt: string;
          lastSeenAt: string;
          expiresAt: string;
          current: boolean;
        }[];
      }>('/student/settings', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <h1 className="text-3xl font-black text-helixed-navy">Settings</h1>
        <p className="mt-1 text-slate-500">Manage your private account and security settings.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DashboardCard title="Account">
            <p className="text-sm text-slate-600">
              Your school-issued identity, roles, and memberships are managed by authorized
              workflows.
            </p>
          </DashboardCard>
          <DashboardCard title="Privacy">
            <p className="text-sm text-slate-600">
              Your profile, AI conversations, academics, and applications remain private by default.
            </p>
          </DashboardCard>
          <DashboardCard title="Active sessions">
            {q.isLoading
              ? 'Loading sessions…'
              : q.isError
                ? 'Sessions are unavailable.'
                : q.data?.sessions.map((s) => (
                    <p key={s.id} className="mb-2 text-sm">
                      {s.current ? 'Current session' : 'Active session'} · Last active{' '}
                      {new Date(s.lastSeenAt).toLocaleDateString()}
                    </p>
                  ))}
          </DashboardCard>
          <DashboardCard title="Security">
            <p className="text-sm text-slate-600">
              Password changes and recovery are not available in this approved Settings route.
            </p>
            <button
              onClick={() => void logoutAll()}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white"
            >
              Sign out of all sessions
            </button>
          </DashboardCard>
        </div>
      </div>
    </StudentShell>
  );
}
