import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { StudentShell } from '../student-dashboard/StudentShell';
import { studentAcademicsApi } from './studentAcademics.api';
import type { Exam, Resource, ScheduleItem, Task } from './studentAcademics.types';

type Page =
  | 'overview'
  | 'schedule'
  | 'tasks'
  | 'class-summary'
  | 'notes'
  | 'exams'
  | 'syllabus'
  | 'resources'
  | 'doubts';
const tabs: Array<[string, string]> = [
  ['Overview', '/student/academics'],
  ['Schedule', '/student/academics/schedule'],
  ['Tasks', '/student/academics/tasks'],
  ['Class summaries', '/student/academics/class-summary'],
  ['Notes', '/student/academics/notes'],
  ['Exams', '/student/academics/exams'],
  ['Syllabus', '/student/academics/syllabus'],
  ['Resources', '/student/academics/resources'],
  ['Doubts', '/student/academics/doubts'],
];
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'No date set';
const badge = (label: string, tone = 'blue') => (
  <span className={`rounded-full bg-${tone}-50 px-2.5 py-1 text-xs font-semibold text-${tone}-700`}>
    {label}
  </span>
);

function State({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center text-slate-600">
      {children}
    </main>
  );
}
function AcademicFrame({
  title,
  subtitle,
  page,
  children,
}: PropsWithChildren<{ title: string; subtitle: string; page: Page }>) {
  const { user } = useAuth();
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-6 py-7">
          <div className="absolute -right-12 -top-24 size-72 rounded-full border-[32px] border-cyan-300/40" />
          <div className="absolute right-24 -bottom-24 size-64 rounded-full border-[28px] border-blue-500/30" />
          <p className="relative text-xs font-semibold text-blue-700">Student › Academics</p>
          <h1 className="relative mt-2 text-3xl font-black tracking-tight text-helixed-navy md:text-4xl">
            {title}
          </h1>
          <p className="relative mt-1 text-base text-slate-500">{subtitle}</p>
        </section>
        <nav
          aria-label="Academics navigation"
          className="mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-blue-50 bg-white p-1"
        >
          {tabs.map(([label, href]) => (
            <Link
              key={href}
              to={href}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${page === (href.split('/').pop() === 'academics' ? 'overview' : href.split('/').pop()?.replace('class-summary', 'class-summary')) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
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
  if (query.isLoading) return <State>Loading your academic records…</State>;
  if (query.isError)
    return (
      <State>
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Academics are unavailable</h1>
          <button
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
            onClick={() => query.refetch()}
          >
            Try again
          </button>
        </div>
      </State>
    );
  return <>{query.data && children(query.data)}</>;
}

function Priority({ priority }: { priority: Task['priority'] }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${priority === 'high' ? 'bg-rose-100 text-rose-600' : priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
    >
      {priority}
    </span>
  );
}
function ScheduleList({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="space-y-2">
      {items.length ? (
        items.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 rounded-xl border-l-4 bg-slate-50 p-3"
            style={{
              borderColor:
                item.color === 'orange'
                  ? '#fb923c'
                  : item.color === 'purple'
                    ? '#a855f7'
                    : '#3b82f6',
            }}
          >
            <p className="w-20 text-xs font-semibold text-slate-500">{date(item.startsAt)}</p>
            <div>
              <p className="font-bold text-helixed-navy">{item.title}</p>
              <p className="text-xs text-slate-500">{item.detail}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="py-5 text-sm text-slate-500">No classes or academic events yet.</p>
      )}
    </div>
  );
}
function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {tasks.length ? (
        tasks.map((task) => (
          <Link
            key={task.id}
            to={`/student/academics/tasks/${task.id}`}
            className="flex items-center gap-3 py-3 hover:bg-blue-50/50"
          >
            <span className="size-5 rounded border border-slate-300" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-helixed-navy">{task.title}</p>
              <p className="text-xs text-slate-500">
                {task.subject?.name ?? 'General'} · Due {date(task.dueAt)}
              </p>
            </div>
            <Priority priority={task.priority} />
          </Link>
        ))
      ) : (
        <p className="py-5 text-sm text-slate-500">No tasks yet.</p>
      )}
    </div>
  );
}

export function StudentAcademicsPage({ page = 'overview' }: { page?: Page }) {
  const { accessToken } = useAuth();
  const queries = {
    overview: () => studentAcademicsApi.overview(accessToken!),
    schedule: () => studentAcademicsApi.schedule(accessToken!),
    tasks: () => studentAcademicsApi.tasks(accessToken!),
    'class-summary': () => studentAcademicsApi.classSummary(accessToken!),
    notes: () => studentAcademicsApi.notes(accessToken!),
    exams: () => studentAcademicsApi.exams(accessToken!),
    syllabus: () => studentAcademicsApi.syllabus(accessToken!),
    resources: () => studentAcademicsApi.resources(accessToken!),
    doubts: () => studentAcademicsApi.doubts(accessToken!),
  };
  const query = useQuery<unknown>({
    queryKey: ['student-academics', page],
    queryFn: async () => queries[page](),
    enabled: !!accessToken,
  });
  return (
    <QueryView query={query}>{(data) => <AcademicContent page={page} data={data} />}</QueryView>
  );
}

function AcademicContent({ page, data }: { page: Page; data: unknown }) {
  if (page === 'overview') {
    const value = data as Awaited<ReturnType<typeof studentAcademicsApi.overview>>;
    const pending = value.tasks.filter((task) => !task.completedAt).length;
    return (
      <AcademicFrame title="Academics" subtitle="Your academic journey in one place." page={page}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Subjects', value.subjects.length],
            ['Pending assignments', pending],
            ['Upcoming exams', value.exams.length],
            [
              'Overall performance',
              `${Math.round(value.subjects.reduce((sum, subject) => sum + subject.progress, 0) / Math.max(value.subjects.length, 1))}%`,
            ],
          ].map(([label, count]) => (
            <DashboardCard key={String(label)} title={String(label)}>
              <p className="text-3xl font-black text-helixed-navy">{count}</p>
            </DashboardCard>
          ))}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_275px]">
          <div className="space-y-4">
            <DashboardCard title="Your Subjects">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {value.subjects.map((subject) => (
                  <div key={subject.id} className="rounded-xl border border-blue-50 p-3">
                    <p className="font-bold text-helixed-navy">{subject.name}</p>
                    <div className="mt-4 h-2 rounded-full bg-blue-50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{subject.progress}% complete</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
            <div className="grid gap-4 lg:grid-cols-2">
              <DashboardCard title="Today's Schedule">
                <ScheduleList items={value.schedule} />
              </DashboardCard>
              <DashboardCard title="Tasks & Assignments">
                <TaskList tasks={value.tasks} />
              </DashboardCard>
            </div>
          </div>
          <DashboardCard title="Upcoming Exams">
            <ExamList exams={value.exams} />
          </DashboardCard>
        </div>
      </AcademicFrame>
    );
  }
  if (page === 'schedule')
    return (
      <AcademicFrame
        title="Academic Schedule"
        subtitle="Your classes, academic events and study time."
        page={page}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <DashboardCard title="Today’s schedule">
            <ScheduleList items={data as ScheduleItem[]} />
          </DashboardCard>
          <DashboardCard title="Quick actions">
            <p className="text-sm text-slate-500">
              View syllabus, plan study time, and keep deadlines visible.
            </p>
          </DashboardCard>
        </div>
      </AcademicFrame>
    );
  if (page === 'tasks') return <TasksContent tasks={data as Task[]} />;
  if (page === 'class-summary') {
    const value = data as {
      subjects: import('./studentAcademics.types').Subject[];
      schedule: ScheduleItem[];
      tasks: Task[];
    };
    return (
      <AcademicFrame
        title="Class Summary"
        subtitle="Topics, class material and the next steps."
        page={page}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <DashboardCard title="Your classes">
              <div className="grid gap-3 md:grid-cols-2">
                {value.subjects.map((subject) => (
                  <div key={subject.id} className="rounded-xl bg-blue-50 p-4">
                    <p className="font-bold text-helixed-navy">{subject.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {subject.progress}% course progress
                    </p>
                  </div>
                ))}
              </div>
            </DashboardCard>
            <DashboardCard title="Assignments & homework">
              <TaskList tasks={value.tasks} />
            </DashboardCard>
          </div>
          <DashboardCard title="Related classes">
            <ScheduleList items={value.schedule} />
          </DashboardCard>
        </div>
      </AcademicFrame>
    );
  }
  if (page === 'notes') {
    const notes = data as Awaited<ReturnType<typeof studentAcademicsApi.notes>>;
    return (
      <AcademicFrame
        title="Notes"
        subtitle="Capture what you learn. Organize what matters."
        page={page}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <DashboardCard title={`Notes (${notes.length})`}>
            <div className="space-y-3">
              {notes.length ? (
                notes.map((note) => (
                  <article key={note.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-bold text-helixed-navy">{note.title}</p>
                        <p className="mt-1 text-xs text-blue-600">
                          {note.subject?.name ?? 'Personal note'} · {date(note.updatedAt)}
                        </p>
                      </div>
                      {badge('Note', 'purple')}
                    </div>
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
                      {note.content}
                    </p>
                  </article>
                ))
              ) : (
                <p className="py-5 text-sm text-slate-500">No notes yet.</p>
              )}
            </div>
          </DashboardCard>
          <DashboardCard title="Make your notes useful">
            <p className="text-sm text-slate-500">
              Notes are private to your student account and can be revisited alongside related
              coursework.
            </p>
          </DashboardCard>
        </div>
      </AcademicFrame>
    );
  }
  if (page === 'exams')
    return (
      <AcademicFrame
        title="Exams"
        subtitle="See what’s coming and organize your preparation."
        page={page}
      >
        <DashboardCard title="Upcoming exams">
          <ExamList exams={data as Exam[]} expanded />
        </DashboardCard>
      </AcademicFrame>
    );
  if (page === 'syllabus') {
    const value = data as Awaited<ReturnType<typeof studentAcademicsApi.syllabus>>;
    return (
      <AcademicFrame
        title="Syllabus"
        subtitle="See what you’re learning, where you are, and what comes next."
        page={page}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <DashboardCard title="Your subjects">
              <div className="grid gap-3 md:grid-cols-3">
                {value.subjects.map((subject) => (
                  <div key={subject.id} className="rounded-xl border border-blue-50 p-3">
                    <p className="font-bold text-helixed-navy">{subject.name}</p>
                    <p className="mt-2 text-sm text-slate-500">{subject.progress}% covered</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
            <DashboardCard title="Units and topics">
              <div className="space-y-2">
                {value.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                  >
                    <div>
                      <p className="font-semibold text-helixed-navy">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.subject.name}</p>
                    </div>
                    {badge(`${item.progress}%`, item.progress === 100 ? 'emerald' : 'blue')}
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>
          <DashboardCard title="Upcoming exams">
            <p className="text-sm text-slate-500">Review topics before the next assessment.</p>
          </DashboardCard>
        </div>
      </AcademicFrame>
    );
  }
  if (page === 'resources') return <ResourcesContent resources={data as Resource[]} />;
  return <DoubtsContent doubts={data as Awaited<ReturnType<typeof studentAcademicsApi.doubts>>} />;
}

function ExamList({ exams, expanded = false }: { exams: Exam[]; expanded?: boolean }) {
  return (
    <div className="space-y-3">
      {exams.length ? (
        exams.map((exam) => (
          <div
            key={exam.id}
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
          >
            <div className="grid size-12 place-items-center rounded-xl bg-rose-50 font-black text-rose-600">
              {new Date(exam.startsAt).getDate()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-helixed-navy">{exam.title}</p>
              <p className="text-xs text-slate-500">
                {exam.subject?.name ?? exam.detail ?? 'Academic assessment'} · {date(exam.startsAt)}
              </p>
            </div>
            {expanded ? (
              <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                Prepare
              </button>
            ) : null}
          </div>
        ))
      ) : (
        <p className="py-5 text-sm text-slate-500">No upcoming exams.</p>
      )}
    </div>
  );
}
function TasksContent({ tasks }: { tasks: Task[] }) {
  const [search, setSearch] = useState('');
  const visible = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <AcademicFrame title="Tasks" subtitle="Stay on top of what needs to be done." page="tasks">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            'Due today',
            tasks.filter(
              (task) =>
                task.dueAt && new Date(task.dueAt).toDateString() === new Date().toDateString(),
            ).length,
          ],
          ['Pending', tasks.filter((task) => !task.completedAt).length],
          ['Completed', tasks.filter((task) => task.completedAt).length],
          ['All tasks', tasks.length],
        ].map(([label, count]) => (
          <DashboardCard key={String(label)} title={String(label)}>
            <p className="text-3xl font-black text-helixed-navy">{count}</p>
          </DashboardCard>
        ))}
      </div>
      <DashboardCard title="Tasks & Assignments" className="mt-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks…"
          className="mb-3 w-full rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm"
        />
        <TaskList tasks={visible} />
      </DashboardCard>
    </AcademicFrame>
  );
}
function ResourcesContent({ resources }: { resources: Resource[] }) {
  const [search, setSearch] = useState('');
  const visible = resources.filter((resource) =>
    resource.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <AcademicFrame
      title="Resources"
      subtitle="Find the material you need for class, practice, revision, and exploration."
      page="resources"
    >
      <DashboardCard title="Learning resources">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search resources, topics, subjects…"
          className="mb-4 w-full rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.length ? (
            visible.map((resource) => (
              <a
                key={resource.id}
                href={resource.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-100 p-4 hover:border-blue-300"
              >
                <p className="font-bold text-helixed-navy">{resource.title}</p>
                <p className="mt-1 text-xs text-blue-600">
                  {resource.resourceType} · {resource.subject?.name ?? 'General'}
                </p>
                <p className="mt-3 text-sm text-slate-500">{resource.description}</p>
              </a>
            ))
          ) : (
            <p className="py-5 text-sm text-slate-500">No matching resources.</p>
          )}
        </div>
      </DashboardCard>
    </AcademicFrame>
  );
}
function DoubtsContent({
  doubts,
}: {
  doubts: Awaited<ReturnType<typeof studentAcademicsApi.doubts>>;
}) {
  const { accessToken } = useAuth();
  const client = useQueryClient();
  const [question, setQuestion] = useState('');
  const mutation = useMutation({
    mutationFn: () => studentAcademicsApi.createDoubt(accessToken!, { question }),
    onSuccess: () => {
      setQuestion('');
      void client.invalidateQueries({ queryKey: ['student-academics', 'doubts'] });
    },
  });
  return (
    <AcademicFrame
      title="Doubts"
      subtitle="Ask what you don’t understand. Get help that teaches you."
      page="doubts"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardCard title="My doubts">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) mutation.mutate();
            }}
            className="mb-4 flex gap-2"
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a doubt…"
              className="min-w-0 flex-1 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm"
            />
            <button
              disabled={mutation.isPending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Ask
            </button>
          </form>
          {mutation.isError ? (
            <p className="mb-3 text-sm text-rose-600">
              Your doubt could not be submitted. Please try again.
            </p>
          ) : null}
          <div className="space-y-2">
            {doubts.length ? (
              doubts.map((doubt) => (
                <article key={doubt.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold text-helixed-navy">{doubt.question}</p>
                    {badge(doubt.state, doubt.state === 'solved' ? 'emerald' : 'amber')}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {doubt.subject?.name ?? 'General'} · {date(doubt.updatedAt)}
                  </p>
                </article>
              ))
            ) : (
              <p className="py-5 text-sm text-slate-500">No doubts yet. Ask your first question.</p>
            )}
          </div>
        </DashboardCard>
        <DashboardCard title="Next steps">
          <p className="text-sm text-slate-500">
            Use related notes, syllabus topics, and resources to prepare your question.
          </p>
        </DashboardCard>
      </div>
    </AcademicFrame>
  );
}

export function StudentTaskDetailPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-academics', 'task', id],
    queryFn: () => studentAcademicsApi.task(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  return (
    <QueryView query={query}>
      {(task) => (
        <AcademicFrame
          title={task.title}
          subtitle="Task details and academic context."
          page="tasks"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <DashboardCard title="Task description">
                <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                  {task.description ?? 'No additional instructions were provided for this task.'}
                </p>
              </DashboardCard>
              <DashboardCard title="Related academic context">
                <p className="font-semibold text-helixed-navy">
                  {task.subject?.name ?? 'General studies'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Use your notes and resources to complete this work.
                </p>
              </DashboardCard>
            </div>
            <DashboardCard title="Task details">
              <div className="space-y-4 text-sm">
                <p>
                  <span className="text-slate-500">Due date</span>
                  <br />
                  <strong className="text-helixed-navy">{date(task.dueAt)}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Priority</span>
                  <br />
                  <Priority priority={task.priority} />
                </p>
                <p>
                  <span className="text-slate-500">Status</span>
                  <br />
                  <strong className="text-helixed-navy">
                    {task.completedAt ? 'Completed' : 'Not started'}
                  </strong>
                </p>
              </div>
            </DashboardCard>
          </div>
        </AcademicFrame>
      )}
    </QueryView>
  );
}
