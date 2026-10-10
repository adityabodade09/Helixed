import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { TeacherShell } from '../teacher-dashboard/TeacherShell';
import { teacherMessagesApi, type TeacherConversation } from './teacherMessages.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export function TeacherMessagesPage() {
  const { accessToken } = useAuth();
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['teacher-messages', search],
    queryFn: () => teacherMessagesApi.list(accessToken!, search || undefined),
    enabled: !!accessToken,
  });

  if (query.isLoading) return <div className="p-8 text-slate-600">Loading conversations…</div>;
  if (query.isError || !query.data)
    return <div className="p-8 text-rose-600">Teacher messages are restricted or unavailable.</div>;

  return (
    <TeacherShell teacherName={query.data.teacher.displayName}>
      <div className="mx-auto max-w-6xl p-5 lg:p-8">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Teacher · {query.data.school.name}</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy">Messages</h1>
          <p className="mt-2 text-slate-600">
            Your authorized canonical conversations with Students, Parents, and groups.
          </p>
        </header>

        <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim());
            }}
          >
            <input
              aria-label="Search conversations"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search authorized conversations…"
              maxLength={120}
              className="min-w-0 flex-1 rounded-xl border border-blue-100 p-3"
            />
            <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
              Search
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black text-helixed-navy">Inbox</h2>
            <p className="mt-1 text-sm text-slate-500">
              Conversation content will be available in the dedicated thread view.
            </p>
          </div>
          {query.data.conversations.length ? (
            <div className="divide-y divide-slate-100">
              {query.data.conversations.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <h3 className="font-bold text-helixed-navy">
                {search ? 'No matching conversations' : 'No authorized conversations'}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {search
                  ? 'No conversation in your authorized inbox matches this search.'
                  : 'No canonical conversations are currently available to this Teacher account.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </TeacherShell>
  );
}

function ConversationRow({ conversation }: { conversation: TeacherConversation }) {
  return (
    <Link
      to={`/teacher/messages/${conversation.id}`}
      className="grid gap-3 p-5 hover:bg-blue-50/50 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-helixed-navy">{conversation.title}</h3>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            {conversation.participant?.role ?? 'GROUP'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{conversation.contexts.join(' · ')}</p>
        <p className="mt-2 truncate text-sm text-slate-600">
          {conversation.preview ?? 'No messages yet.'}
        </p>
      </div>
      <time className="text-xs text-slate-500" dateTime={conversation.latestAt}>
        {formatDate(conversation.latestAt)}
      </time>
    </Link>
  );
}

export function TeacherMessageDetailPage() {
  const { id = '' } = useParams();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const sendingRef = useRef(false);
  const thread = useQuery({
    queryKey: ['teacher-messages', 'detail', id],
    queryFn: () => teacherMessagesApi.detail(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  const send = useMutation({
    mutationFn: () => teacherMessagesApi.send(accessToken!, id, body),
    onSuccess: async () => {
      setBody('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['teacher-messages', 'detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['teacher-messages'], exact: true }),
      ]);
    },
  });

  if (thread.isLoading) return <div className="p-8 text-slate-600">Loading conversation…</div>;
  if (thread.isError || !thread.data)
    return <div className="p-8 text-rose-600">This conversation is restricted or unavailable.</div>;

  const { conversation } = thread.data;
  return (
    <TeacherShell teacherName={thread.data.teacher.displayName}>
      <div className="mx-auto max-w-5xl p-5 lg:p-8">
        <Link
          to="/teacher/messages"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to Messages
        </Link>
        <header className="mt-4 rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Teacher · {thread.data.school.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black text-helixed-navy">{conversation.title}</h1>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              {conversation.participant?.role ?? 'GROUP'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{conversation.contexts.join(' · ')}</p>
        </header>

        <section className="mt-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <h2 className="sr-only">Conversation history</h2>
          <div className="min-h-80 space-y-4 p-5" aria-label="Conversation history">
            {conversation.messages.length ? (
              conversation.messages.map((message) => (
                <article
                  key={message.id}
                  data-sender={message.sentByTeacher ? 'teacher' : 'participant'}
                  className={`max-w-2xl rounded-2xl p-4 text-sm ${message.sentByTeacher ? 'ml-auto bg-blue-100 text-blue-950' : 'bg-slate-100 text-slate-700'}`}
                >
                  <p>{message.body}</p>
                  <p className="mt-2 text-xs opacity-60">
                    {message.sender.displayName} · {formatDate(message.createdAt)}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">No messages yet.</p>
            )}
          </div>

          <form
            className="border-t border-slate-100 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (body.trim() && !send.isPending && !sendingRef.current) {
                sendingRef.current = true;
                send.mutate(undefined, {
                  onSettled: () => {
                    sendingRef.current = false;
                  },
                });
              }
            }}
          >
            <label htmlFor="teacher-message" className="text-sm font-semibold text-helixed-navy">
              Message
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <textarea
                id="teacher-message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Write a message…"
                className="min-w-0 flex-1 resize-none rounded-xl border border-blue-100 p-3"
              />
              <button
                type="submit"
                disabled={send.isPending || !body.trim()}
                className="self-end rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {send.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
            {send.isError ? (
              <p className="mt-2 text-sm text-rose-600">
                Message was not sent. Your text has been preserved.
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </TeacherShell>
  );
}
