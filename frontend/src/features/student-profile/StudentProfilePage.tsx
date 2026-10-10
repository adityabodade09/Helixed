import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { StudentShell } from '../student-dashboard/StudentShell';
const tabs = [
  'overview',
  'academic',
  'activities',
  'achievements',
  'certificates',
  'creative-work',
  'share',
];
type Profile = {
  displayName: string;
  bio: string | null;
  interests: string[];
  activities: { id: string; title: string; category: string | null }[];
  certificates: { id: string; title: string; issuer: string | null; state: string }[];
};
export function StudentProfilePage({ page = 'overview' }: { page?: string }) {
  const { accessToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const query = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => apiRequest<Profile>('/student/profile', { accessToken: accessToken! }),
    enabled: !!accessToken,
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<Profile>('/student/profile', {
        accessToken: accessToken!,
        method: 'PATCH',
        body: { bio },
      }),
    onSuccess: () => {
      setEditing(false);
      query.refetch();
    },
  });
  if (query.isLoading) return <p className="p-6">Loading profile…</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-rose-600">Profile is unavailable.</p>;
  const p = query.data;
  return (
    <StudentShell studentName={p.displayName}>
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <section className="rounded-3xl bg-helixed-navy p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-helixed-cyan text-3xl font-black">
              {p.displayName[0]}
            </div>
            <div>
              <h1 className="text-3xl font-black">{p.displayName}</h1>
              <p className="text-blue-100">Your private student profile</p>
            </div>
          </div>
        </section>
        <nav className="my-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t}
              to={t === 'overview' ? '/student/profile' : `/student/profile/${t}`}
              className={
                page === t
                  ? 'rounded-lg bg-blue-600 px-3 py-2 text-white'
                  : 'rounded-lg border px-3 py-2'
              }
            >
              {t.replace('-', ' ')}
            </Link>
          ))}
        </nav>
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard title="About you">
            <p>{p.bio ?? 'Add a short introduction to your private profile.'}</p>
            {editing ? (
              <>
                <textarea
                  aria-label="Profile bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-3 w-full border p-2"
                  maxLength={1000}
                />
                <button
                  onClick={() => mutation.mutate()}
                  className="mt-2 rounded bg-blue-600 px-3 py-2 text-white"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setBio(p.bio ?? '');
                  setEditing(true);
                }}
                className="mt-3 text-blue-700"
              >
                Edit profile
              </button>
            )}
          </DashboardCard>
          <DashboardCard title="Interests">
            {p.interests.length ? p.interests.join(' · ') : 'No interests added yet.'}
          </DashboardCard>
          <DashboardCard title="Activities">
            {p.activities.map((a) => (
              <p key={a.id}>
                {a.title} {a.category ? `· ${a.category}` : ''}
              </p>
            )) || 'No activities yet.'}
          </DashboardCard>
          <DashboardCard title="Certificates">
            {p.certificates.map((c) => (
              <p key={c.id}>
                {c.title} · {c.state}
              </p>
            )) || 'No certificates yet.'}
          </DashboardCard>
        </div>
      </div>
    </StudentShell>
  );
}
