import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherAssignmentsApi, type CreateAssignmentInput } from './teacherAssignments.api';

export function CreateTeacherAssignmentPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [status, setStatus] = useState<CreateAssignmentInput['status']>('DRAFT');
  const [validationError, setValidationError] = useState('');
  const options = useQuery({
    queryKey: ['teacher-assignments', 'create-options'],
    queryFn: () => teacherAssignmentsApi.get(accessToken!, {}),
    enabled: Boolean(accessToken),
  });
  const selectedClass = options.data?.classes.find((schoolClass) => schoolClass.id === classId);
  const mutation = useMutation({
    mutationFn: (input: CreateAssignmentInput) => teacherAssignmentsApi.create(accessToken!, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      navigate('/teacher/assignments');
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!classId || !subjectName || !cleanTitle) {
      setValidationError('Choose an assigned class and subject, then enter a title.');
      return;
    }
    setValidationError('');
    mutation.mutate({
      classId,
      subjectName,
      title: cleanTitle,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
      status,
    });
  };

  return (
    <TeacherShell teacherName={options.data?.teacher.displayName ?? user?.displayName ?? 'Teacher'}>
      <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <Link to="/teacher/assignments" className="text-sm font-bold text-blue-700">
            ← Back to assignments
          </Link>
          <h1 className="mt-4 text-3xl font-black text-helixed-navy md:text-4xl">
            Create assignment
          </h1>
          <p className="mt-2 text-slate-600">
            Create canonical work for one of your actively assigned classes.
          </p>
        </section>

        {options.isLoading ? <State text="Loading assigned classes…" /> : null}
        {options.isError ? <State text="Assignment creation is unavailable." error /> : null}
        {options.data && !options.data.classes.length ? (
          <State text="No assigned classes are available for assignment creation." />
        ) : null}
        {options.data?.classes.length ? (
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Assigned class">
                <select
                  aria-label="Assigned class"
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setSubjectName('');
                  }}
                  disabled={mutation.isPending}
                  className="input"
                >
                  <option value="">Choose a class</option>
                  {options.data.classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subject">
                <select
                  aria-label="Subject"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  disabled={!selectedClass || mutation.isPending}
                  className="input"
                >
                  <option value="">Choose a subject</option>
                  {selectedClass?.subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Assignment title">
              <input
                aria-label="Assignment title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={240}
                disabled={mutation.isPending}
                className="input"
                placeholder="e.g. Linear equations practice"
              />
            </Field>
            <Field label="Instructions (optional)">
              <textarea
                aria-label="Instructions (optional)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                rows={5}
                disabled={mutation.isPending}
                className="input resize-y"
                placeholder="Add clear instructions for the class."
              />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Due date and time (optional)">
                <input
                  aria-label="Due date and time (optional)"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  disabled={mutation.isPending}
                  className="input"
                />
              </Field>
              <Field label="Initial status">
                <select
                  aria-label="Initial status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as CreateAssignmentInput['status'])
                  }
                  disabled={mutation.isPending}
                  className="input"
                >
                  <option value="DRAFT">Save as draft</option>
                  <option value="PUBLISHED">Publish now</option>
                </select>
              </Field>
            </div>

            {validationError ? (
              <p className="text-sm font-semibold text-rose-700">{validationError}</p>
            ) : null}
            {mutation.isError ? (
              <p className="text-sm font-semibold text-rose-700">
                The assignment was not created. Check your access and form values, then try again.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <Link
                to="/teacher/assignments"
                className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {mutation.isPending
                  ? 'Creating assignment…'
                  : status === 'DRAFT'
                    ? 'Save draft'
                    : 'Publish assignment'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </TeacherShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function State({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p
      className={`rounded-2xl p-5 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-500 shadow-sm'}`}
    >
      {text}
    </p>
  );
}
