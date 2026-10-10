import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherDevelopmentApi, type TeacherDevelopment } from './teacherDevelopment.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );

export function TeacherDevelopmentPage() {
  const { accessToken, user } = useAuth();
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const query = useQuery({
    queryKey: ['teacher-development', classId, studentId],
    queryFn: () =>
      teacherDevelopmentApi.get(accessToken!, {
        classId: classId || undefined,
        studentId: studentId || undefined,
      }),
    enabled: Boolean(accessToken),
  });

  const displayedClassId = classId || query.data?.selection?.class.id || '';
  const displayedStudentId = studentId || query.data?.selection?.student.id || '';
  const selectedClass = query.data?.classes.find(({ id }) => id === displayedClassId);
  const teacherName = query.data?.teacher.displayName ?? user?.displayName ?? 'Teacher';

  return (
    <TeacherShell teacherName={teacherName}>
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Observable evidence
              </p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">
                Development
              </h1>
              <p className="mt-2 text-slate-600">
                Review factual academic and attendance records without scores, rankings, or
                predictions.
              </p>
            </div>
            {query.data?.classes.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">
                  Assigned class
                  <select
                    aria-label="Select development class"
                    value={displayedClassId}
                    onChange={(event) => {
                      setClassId(event.target.value);
                      setStudentId('');
                    }}
                    className="mt-2 block min-w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {query.data.classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Authorized student
                  <select
                    aria-label="Select development student"
                    value={displayedStudentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    className="mt-2 block min-w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {(selectedClass?.students ?? []).map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </section>

        {query.isLoading ? <StateCard text="Loading authorized development evidence…" /> : null}
        {query.isError ? (
          <StateCard text="Teacher development is restricted or unavailable." error />
        ) : null}
        {query.data && query.data.classes.length === 0 ? (
          <StateCard text="No assigned classes are available for development evidence." />
        ) : null}
        {query.data && query.data.classes.length > 0 && !query.data.selection ? (
          <StateCard text="No active students are available in this assigned class." />
        ) : null}
        {query.data?.selection ? <DevelopmentView data={query.data} /> : null}
      </div>
    </TeacherShell>
  );
}

function DevelopmentView({ data }: { data: TeacherDevelopment }) {
  const selection = data.selection!;
  return (
    <>
      <section className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Selected context</p>
        <h2 className="mt-1 text-2xl font-black text-helixed-navy">
          {selection.student.displayName}
        </h2>
        <p className="text-sm text-slate-600">
          {selection.class.name} · {data.school.name}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Development facts">
        <FactCard
          label="Recorded assessment average"
          value={
            data.assessments.normalizedAverage === null
              ? 'Unavailable'
              : `${data.assessments.normalizedAverage}%`
          }
        />
        <FactCard
          label="Known present rate"
          value={
            data.attendance.presentRate === null ? 'Unavailable' : `${data.attendance.presentRate}%`
          }
          tone="green"
        />
        <FactCard label="Recorded assessments" value={data.assessments.recorded} tone="violet" />
        <FactCard
          label="Class assignments"
          value={data.classAssignments.items.length}
          tone="amber"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-helixed-navy">Assessment evidence over time</h2>
          <p className="mt-1 text-xs text-slate-500">
            Current recorded marks are normalized by each assessment maximum. Missing marks remain
            NOT RECORDED.
          </p>
          {data.assessments.items.length ? (
            <div className="mt-4 space-y-2" aria-label="Assessment evidence">
              {data.assessments.items.map((assessment) => (
                <article key={assessment.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-helixed-navy">{assessment.title}</p>
                      <p className="text-xs text-slate-500">
                        {assessment.subjectName} · {formatDate(assessment.assessedAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${assessment.mark === null ? 'bg-slate-100 text-slate-600' : 'bg-violet-50 text-violet-700'}`}
                    >
                      {assessment.mark === null
                        ? 'NOT RECORDED'
                        : `${assessment.mark}/${assessment.maximumMarks} (${assessment.normalizedPercent}%)`}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty text="No assessment evidence is recorded for this student in this class." />
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-helixed-navy">Official attendance evidence</h2>
          <p className="mt-1 text-xs text-slate-500">
            {data.attendance.known} recorded · {data.attendance.missing} not recorded. Missing is
            never treated as absent.
          </p>
          {data.attendance.sessions.length ? (
            <div className="mt-4 space-y-2" aria-label="Attendance evidence">
              {data.attendance.sessions.map((session) => (
                <article
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-bold text-helixed-navy">{session.subjectName}</p>
                    <p className="text-xs text-slate-500">{formatDate(session.startsAt)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${session.state === null ? 'bg-slate-100 text-slate-600' : session.state === 'ABSENT' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    {session.state ?? 'NOT RECORDED'}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <Empty text="No completed attendance sessions are available." />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-helixed-navy">Class assignment context</h2>
        <p className="mt-1 text-xs text-slate-500">
          These are class-level Assignments. Without canonical Submissions, no Student completion or
          missing-work claim is made.
        </p>
        {data.classAssignments.items.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.classAssignments.items.map((assignment) => (
              <article key={assignment.id} className="rounded-xl border border-slate-100 p-3">
                <p className="font-bold text-helixed-navy">{assignment.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {assignment.subjectName} · {assignment.status.toLowerCase()} ·{' '}
                  {assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : 'No due date'}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="No canonical Assignments are recorded for this class." />
        )}
      </section>

      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-900">
        <h2 className="font-black">Evidence boundary</h2>
        <p className="mt-1">
          Teacher-visible activity sharing, observations, recommendations, and development scores
          are unavailable. No AI, ranking, profiling, or prediction is used.
        </p>
      </section>
    </>
  );
}

function FactCard({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'amber' | 'violet';
}) {
  const colors = {
    blue: 'border-blue-100 text-blue-700',
    green: 'border-emerald-100 text-emerald-700',
    amber: 'border-amber-100 text-amber-700',
    violet: 'border-violet-100 text-violet-700',
  };
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${colors[tone]}`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>;
}

function StateCard({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p
      className={`rounded-2xl p-6 text-center text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-500 shadow-sm'}`}
    >
      {text}
    </p>
  );
}
