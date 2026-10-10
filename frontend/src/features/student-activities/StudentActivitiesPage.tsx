import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { StudentShell } from '../student-dashboard/StudentShell';
import { activitiesApi, type ActivityDetail, type Certificate } from './studentActivities.api';

const categories = [
  'Sports',
  'Creative',
  'Technology',
  'Communication',
  'Leadership & Community',
  'Other',
];
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(
        new Date(value),
      )
    : 'Not set';
function State({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-600">
      {children}
    </main>
  );
}
function Frame({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  const { user } = useAuth();
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-6 py-7">
          <div className="absolute -right-12 -top-24 size-72 rounded-full border-[32px] border-cyan-300/40" />
          <p className="relative text-xs font-semibold text-blue-700">Student › Activities</p>
          <h1 className="relative mt-2 text-3xl font-black text-helixed-navy md:text-4xl">
            {title}
          </h1>
          <p className="relative mt-1 text-base text-slate-500">{subtitle}</p>
        </section>
        <div className="mt-4">{children}</div>
      </div>
    </StudentShell>
  );
}
function QueryView<T>({
  query,
  children,
}: {
  query: ReturnType<typeof useQuery<T>>;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <State>Loading your activities…</State>;
  if (query.isError)
    return (
      <State>
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Activities are unavailable</h1>
          <button
            onClick={() => query.refetch()}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-white"
          >
            Try again
          </button>
        </div>
      </State>
    );
  return <>{query.data && children(query.data)}</>;
}
const Status = ({ value }: { value: string }) => (
  <span
    className={`rounded-full px-2 py-1 text-xs font-semibold ${value === 'active' || value === 'verified' ? 'bg-emerald-100 text-emerald-700' : value === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
  >
    {value.replace('_', ' ')}
  </span>
);

export function StudentActivitiesPage() {
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['student-activities'],
    queryFn: () => activitiesApi.list(accessToken!),
    enabled: !!accessToken,
  });
  return (
    <QueryView query={query}>
      {(activities) => (
        <Frame
          title="Activities"
          subtitle="Explore what you enjoy. Build what you’re capable of. Show how you grow."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-helixed-navy"
              >
                {category}
              </span>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-helixed-navy">My Activities</h2>
                <Link
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  to="/student/activities/add"
                >
                  + Add activity
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {activities.length ? (
                  activities.map((activity) => (
                    <Link
                      key={activity.id}
                      to={`/student/activities/${activity.id}`}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-300"
                    >
                      <div className="mb-4 h-24 rounded-xl bg-gradient-to-br from-blue-100 via-cyan-50 to-orange-100" />
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-helixed-navy">{activity.title}</p>
                        <Status value={activity.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {activity.category ?? 'Other'} · Since {date(activity.startedAt)}
                      </p>
                      <p className="mt-4 text-xs text-slate-500">
                        {activity.organization ?? 'Personal activity'}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="py-8 text-slate-500">No activities yet. Add your first activity.</p>
                )}
              </div>
              <DashboardCard title="Recent Progress">
                <p className="text-sm text-slate-500">
                  Track your activity milestones, participation, and evidence here.
                </p>
              </DashboardCard>
            </div>
            <aside className="space-y-4">
              <DashboardCard title="Upcoming Activity Events">
                <p className="text-sm text-slate-500">
                  Activity events will appear here when available.
                </p>
              </DashboardCard>
              <DashboardCard title="Activity Insights">
                <div className="grid grid-cols-2 gap-3">
                  <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    {activities.filter((activity) => activity.status === 'active').length} active
                  </p>
                  <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                    {activities.length} total
                  </p>
                </div>
              </DashboardCard>
            </aside>
          </div>
        </Frame>
      )}
    </QueryView>
  );
}

export function AddStudentActivityPage() {
  const { accessToken } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [startedAt, setStartedAt] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      activitiesApi.create(accessToken!, {
        title,
        category,
        startedAt,
        organization: organization || undefined,
        description: description || undefined,
      }),
    onSuccess: (activity) => {
      void client.invalidateQueries({ queryKey: ['student-activities'] });
      navigate(`/student/activities/${activity.id}`);
    },
  });
  return (
    <Frame
      title="Add activity"
      subtitle="Tell Helixed what you’re involved in. You can add more details later."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardCard title="Basic details">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <label className="block text-sm font-semibold text-helixed-navy">
              Activity name
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-blue-100 p-3"
              />
            </label>
            <div>
              <p className="text-sm font-semibold text-helixed-navy">Category</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {categories.map((value) => (
                  <button
                    type="button"
                    onClick={() => setCategory(value)}
                    key={value}
                    className={`rounded-xl border p-3 text-sm ${category === value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-600'}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-semibold text-helixed-navy">
              Start date
              <input
                required
                type="date"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-blue-100 p-3"
              />
            </label>
            <label className="block text-sm font-semibold text-helixed-navy">
              Organization (optional)
              <input
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
                className="mt-1 w-full rounded-xl border border-blue-100 p-3"
              />
            </label>
            <label className="block text-sm font-semibold text-helixed-navy">
              Description (optional)
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border border-blue-100 p-3"
              />
            </label>
            {mutation.isError ? (
              <p className="text-sm text-rose-600">Could not add the activity. Try again.</p>
            ) : null}
            <button
              disabled={mutation.isPending}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Add activity
            </button>
          </form>
        </DashboardCard>
        <DashboardCard title="Activity preview">
          <div className="h-32 rounded-xl bg-gradient-to-br from-blue-100 via-cyan-50 to-orange-100" />
          <p className="mt-3 font-bold text-helixed-navy">{title || 'Your activity'}</p>
          <p className="mt-1 text-sm text-slate-500">{category}</p>
        </DashboardCard>
      </div>
    </Frame>
  );
}

function ActivityDetailContent({
  activity,
  progress = false,
}: {
  activity: ActivityDetail;
  progress?: boolean;
}) {
  return (
    <Frame
      title={activity.title}
      subtitle={
        progress
          ? 'Progress & development — see how your activity has grown over time.'
          : (activity.description ?? 'Your activity overview, milestones, and evidence.')
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Status value={activity.status} />
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
          {activity.category ?? 'Other'}
        </span>
        <span className="text-sm text-slate-500">
          {activity.organization ?? 'Personal activity'} · Since {date(activity.startedAt)}
        </span>
      </div>
      {progress ? (
        <ProgressView activity={activity} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <DashboardCard title="About this activity">
                <p className="text-sm text-slate-600">
                  {activity.description ?? 'No description added yet.'}
                </p>
              </DashboardCard>
              <DashboardCard title="Goals & milestones">
                <Milestones items={activity.milestones} />
              </DashboardCard>
            </div>
            <DashboardCard title="Recent progress">
              <ProgressEntries items={activity.progress} />
            </DashboardCard>
          </div>
          <aside className="space-y-4">
            <DashboardCard title="Certificates">
              <p className="text-3xl font-black text-helixed-navy">
                {activity.certificates.length}
              </p>
              <Link
                to="/student/activities/certificates"
                className="mt-2 inline-block text-sm font-semibold text-blue-600"
              >
                View certificates →
              </Link>
            </DashboardCard>
            <DashboardCard title="Quick actions">
              <p className="text-sm text-slate-500">
                Add a future update, evidence, or certificate from the appropriate approved
                workflow.
              </p>
            </DashboardCard>
          </aside>
        </div>
      )}
    </Frame>
  );
}
function ProgressEntries({ items }: { items: ActivityDetail['progress'] }) {
  return (
    <div className="space-y-3">
      {items.length ? (
        items.map((item) => (
          <div key={item.id} className="border-l-2 border-blue-500 pl-3">
            <p className="font-semibold text-helixed-navy">{item.title}</p>
            <p className="text-xs text-slate-500">
              {item.detail} · {date(item.occurredAt)}
            </p>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">No progress entries yet.</p>
      )}
    </div>
  );
}
function Milestones({ items }: { items: ActivityDetail['milestones'] }) {
  return (
    <div className="space-y-3">
      {items.length ? (
        items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-helixed-navy">{item.title}</span>
              <span>{item.progress}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-blue-50">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">No milestones yet.</p>
      )}
    </div>
  );
}
function ProgressView({ activity }: { activity: ActivityDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Progress entries', activity.progress.length],
            ['Milestones', activity.milestones.length],
            ['Completed', activity.milestones.filter((item) => item.completedAt).length],
            ['Certificates', activity.certificates.length],
          ].map(([label, value]) => (
            <DashboardCard key={String(label)} title={String(label)}>
              <p className="text-3xl font-black text-helixed-navy">{value}</p>
            </DashboardCard>
          ))}
        </div>
        <DashboardCard title="Recent progress">
          <ProgressEntries items={activity.progress} />
        </DashboardCard>
      </div>
      <DashboardCard title="Milestones">
        <Milestones items={activity.milestones} />
      </DashboardCard>
    </div>
  );
}
export function StudentActivityDetailPage({ progress = false }: { progress?: boolean }) {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-activities', progress ? 'progress' : 'detail', id],
    queryFn: () =>
      progress ? activitiesApi.progress(accessToken!, id) : activitiesApi.get(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  return (
    <QueryView query={query}>
      {(activity) => <ActivityDetailContent activity={activity} progress={progress} />}
    </QueryView>
  );
}
export function StudentActivityCertificatesPage() {
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['student-activities', 'certificates'],
    queryFn: () => activitiesApi.certificates(accessToken!),
    enabled: !!accessToken,
  });
  return (
    <QueryView query={query}>
      {(certificates) => (
        <Frame
          title="Certificates"
          subtitle="Certificates and supporting evidence for your activities."
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <DashboardCard title="All certificates">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {certificates.length ? (
                  certificates.map((certificate: Certificate) => (
                    <article
                      key={certificate.id}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <div className="h-24 rounded-lg bg-gradient-to-r from-amber-100 to-blue-100" />
                      <p className="mt-3 font-bold text-helixed-navy">{certificate.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {certificate.issuer ?? 'Issuer not set'} · {date(certificate.issuedAt)}
                      </p>
                      <div className="mt-3">
                        <Status value={certificate.state} />
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="py-5 text-sm text-slate-500">No certificates yet.</p>
                )}
              </div>
            </DashboardCard>
            <DashboardCard title="Certificate insights">
              <p className="text-3xl font-black text-helixed-navy">{certificates.length}</p>
              <p className="text-sm text-slate-500">total certificates</p>
            </DashboardCard>
          </div>
        </Frame>
      )}
    </QueryView>
  );
}
