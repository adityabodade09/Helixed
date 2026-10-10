import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { ParentShell } from '../parent-dashboard/ParentShell';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { parentSettingsApi } from './parentSettings.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export function ParentSettingsPage() {
  const { accessToken, user, logoutAll } = useAuth();
  const query = useQuery({
    queryKey: ['parent-settings'],
    queryFn: () => parentSettingsApi.get(accessToken!),
    enabled: !!accessToken,
  });
  const logout = useMutation({ mutationFn: logoutAll });
  const parentName = query.data?.account.displayName ?? user?.displayName ?? 'Parent';

  return (
    <ParentShell parentName={parentName}>
      <div className="mx-auto max-w-6xl p-4 md:p-7">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Parent › Settings</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Settings</h1>
          <p className="mt-2 text-slate-600">
            Review your own account and active sessions. Child account security remains separate.
          </p>
        </header>

        {query.isLoading ? <p className="mt-6">Loading account settings…</p> : null}
        {query.isError ? (
          <p className="mt-6 rounded-2xl bg-rose-50 p-5 text-rose-700">
            Settings are unavailable for this account.
          </p>
        ) : null}

        {query.data ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <DashboardCard title="Your account">
              <dl className="space-y-3 text-sm">
                <SettingRow label="Name" value={query.data.account.displayName ?? 'Not provided'} />
                <SettingRow label="Account" value={query.data.account.loginIdentifier} />
                <SettingRow label="Status" value={query.data.account.accountState} />
              </dl>
              <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                Guardian verification and child relationships are managed through verified Helixed
                workflows, not from account settings.
              </p>
            </DashboardCard>

            <DashboardCard title="Privacy boundary">
              <p className="text-sm leading-6 text-slate-600">
                This page contains only your account information. Child sessions, passwords, private
                preferences, AI history, and Community data are not available here.
              </p>
            </DashboardCard>

            <DashboardCard title="Active sessions" className="lg:col-span-2">
              {query.data.sessions.length ? (
                <div className="divide-y divide-slate-100">
                  {query.data.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-semibold text-helixed-navy">
                          {session.current ? 'Current session' : 'Active session'}
                        </p>
                        <p className="text-sm text-slate-500">
                          Last active {formatDate(session.lastSeenAt)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        Expires {formatDate(session.expiresAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No active sessions are available.</p>
              )}
            </DashboardCard>

            <DashboardCard title="Security" className="lg:col-span-2">
              <p className="text-sm text-slate-600">
                Sign out every session connected to your Parent account. This does not affect any
                child or teacher account.
              </p>
              <button
                type="button"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
                className="mt-4 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {logout.isPending ? 'Signing out…' : 'Sign out of all sessions'}
              </button>
              {logout.isError ? (
                <p className="mt-3 text-sm text-rose-700">Unable to sign out all sessions.</p>
              ) : null}
              <p className="mt-4 text-xs text-slate-500">
                Password, email, MFA, recovery, and account deletion changes are not available in
                this approved settings milestone.
              </p>
            </DashboardCard>
          </div>
        ) : null}
      </div>
    </ParentShell>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-100 pb-3 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-helixed-navy">{value}</dd>
    </div>
  );
}
