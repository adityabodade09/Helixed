import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import {
  teacherAssignmentsApi,
  type AssignmentStatus,
  type TeacherAssignments,
} from './teacherAssignments.api';

const statuses: AssignmentStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'OPEN',
  'CLOSED',
  'ARCHIVED',
  'CANCELLED',
];

const statusStyle: Record<AssignmentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-blue-50 text-blue-700',
  PUBLISHED: 'bg-cyan-50 text-cyan-700',
  OPEN: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-violet-50 text-violet-700',
  ARCHIVED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-rose-50 text-rose-700',
};

const formatDueDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(value),
      )
    : 'No due date';

export function TeacherAssignmentsPage() {
  const { accessToken, user } = useAuth();
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<AssignmentStatus | ''>('');
  const query = useQuery({
    queryKey: ['teacher-assignments', search, classId, status],
    queryFn: () =>
      teacherAssignmentsApi.get(accessToken!, {
        search: search || undefined,
        classId: classId || undefined,
        status: status || undefined,
      }),
    enabled: Boolean(accessToken),
    placeholderData: (previous) => previous,
  });
  const teacherName = query.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-black text-helixed-navy md:text-4xl">Assignments</h1>
              <p className="mt-2 text-slate-600">
                Review canonical assignments for your authorized classes.
              </p>
            </div>
            <Link
              to="/teacher/assignments/create"
              className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              + Create Assignment
            </Link>
          </div>
        </section>

        {query.isLoading ? <StateCard text="Loading authorized assignments…" /> : null}
        {query.isError ? <StateCard text="Teacher assignments are unavailable." error /> : null}
        {query.data ? (
          <AssignmentsView
            data={query.data}
            search={search}
            classId={classId}
            status={status}
            onSearch={setSearch}
            onClass={setClassId}
            onStatus={setStatus}
          />
        ) : null}
      </div>
    </TeacherShell>
  );
}

function AssignmentsView({
  data,
  search,
  classId,
  status,
  onSearch,
  onClass,
  onStatus,
}: {
  data: TeacherAssignments;
  search: string;
  classId: string;
  status: AssignmentStatus | '';
  onSearch: (value: string) => void;
  onClass: (value: string) => void;
  onStatus: (value: AssignmentStatus | '') => void;
}) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Assignment summary">
        <Summary label="Total assignments" value={data.summary.total} />
        <Summary label="Active assignments" value={data.summary.active} tone="green" />
        <Summary label="Due in 7 days" value={data.summary.dueThisWeek} tone="amber" />
        <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Submission overview</p>
          <p className="mt-2 font-bold text-violet-700">Not available</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Canonical submissions and grading are not implemented.
          </p>
        </article>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="text-xs font-bold text-slate-600">
          Search assignments
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search title or subject"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Assigned class
          <select
            value={classId}
            onChange={(event) => onClass(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All assigned classes</option>
            {data.classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Status
          <select
            value={status}
            onChange={(event) => onStatus(event.target.value as AssignmentStatus | '')}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!data.assignments.length ? (
        <StateCard
          text={
            search || classId || status
              ? 'No authorized assignments match these filters.'
              : 'No assignments are available for your assigned classes.'
          }
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-black text-helixed-navy">Authorized assignments</h2>
            <p className="text-sm text-slate-500">{data.school.name}</p>
          </div>
          <div className="divide-y divide-slate-100" aria-label="Authorized assignments">
            {data.assignments.map((assignment) => (
              <article
                key={assignment.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_1fr_1fr_auto] md:items-center"
              >
                <div>
                  <h3 className="font-bold text-helixed-navy">{assignment.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{assignment.subjectName}</p>
                </div>
                <p className="text-sm text-slate-600">{assignment.class.name}</p>
                <p className="text-sm text-slate-600">{formatDueDate(assignment.dueAt)}</p>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusStyle[assignment.status]}`}
                >
                  {assignment.status.toLowerCase()}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Summary({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: number;
  tone?: 'blue' | 'green' | 'amber';
}) {
  const colors = {
    blue: 'border-blue-100 text-blue-700',
    green: 'border-emerald-100 text-emerald-700',
    amber: 'border-amber-100 text-amber-700',
  };
  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm ${colors[tone]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function StateCard({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p
      className={`rounded-2xl p-5 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-500 shadow-sm'}`}
    >
      {text}
    </p>
  );
}
