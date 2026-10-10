import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';

type TeachersResponse = {
  child: { id: string; displayName: string | null };
  teachers: { id: string; displayName: string; classes: { name: string; schoolName: string }[] }[];
};

export function ParentTeachersPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const query = useQuery({
    queryKey: ['parent-child-teachers', id],
    queryFn: () =>
      apiRequest<TeachersResponse>(`/parent/children/${id}/teachers`, {
        accessToken: accessToken!,
      }),
    enabled: !!accessToken && !!id,
  });
  if (query.isLoading)
    return <main className="min-h-screen bg-slate-50 p-6">Loading teachers…</main>;
  if (query.isError || !query.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Teachers are unavailable in this authorized child context.
      </main>
    );
  const { child, teachers } = query.data;
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link to={`/parent/children/${child.id}`} className="text-sm font-semibold text-blue-700">
          ← {child.displayName ?? 'Student'}’s overview
        </Link>
        <header className="mt-3 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">
            Children › {child.displayName ?? 'Student'} › Teachers
          </p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
            {child.displayName ?? 'Student'}’s teachers
          </h1>
          <p className="mt-2 text-slate-600">
            Teachers assigned to this child’s current class context.
          </p>
        </header>
        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.length ? (
            teachers.map((teacher) => (
              <DashboardCard key={teacher.id} title={teacher.displayName}>
                <p className="text-sm font-semibold text-slate-600">Assigned teacher</p>
                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  {teacher.classes.map((schoolClass) => (
                    <p key={`${teacher.id}-${schoolClass.name}`}>
                      <span className="font-semibold text-helixed-navy">{schoolClass.name}</span>
                      <br />
                      {schoolClass.schoolName}
                    </p>
                  ))}
                </div>
              </DashboardCard>
            ))
          ) : (
            <DashboardCard title="No authorized teachers">
              <p className="text-sm text-slate-600">
                No teachers are currently available for this child’s authorized class context.
              </p>
            </DashboardCard>
          )}
        </section>
        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-slate-600">
          Teacher information is shown only where a current class assignment connects the teacher to
          this child.
        </section>
      </div>
    </main>
  );
}
