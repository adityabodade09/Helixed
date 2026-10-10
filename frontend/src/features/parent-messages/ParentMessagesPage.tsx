import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { useAuth } from '../auth/useAuth';
import { parentMessagesApi } from './parentMessages.api';

const format = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export function ParentMessagesPage() {
  const { accessToken, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string>();
  const conversations = useQuery({
    queryKey: ['parent-messages'],
    queryFn: () => parentMessagesApi.list(accessToken!),
    enabled: !!accessToken,
  });
  const activeId = selectedId ?? conversations.data?.[0]?.id;
  const detail = useQuery({
    queryKey: ['parent-messages', activeId],
    queryFn: () => parentMessagesApi.detail(accessToken!, activeId!),
    enabled: !!accessToken && !!activeId,
  });

  if (conversations.isLoading)
    return <main className="min-h-screen bg-slate-50 p-6">Loading conversations…</main>;
  if (conversations.isError || !conversations.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Messages are unavailable for this account.
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Parent › Messages</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Messages</h1>
          <p className="mt-2 text-slate-600">
            Conversations with teachers connected to your verified children.
          </p>
        </header>
        {conversations.data.length ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <DashboardCard title="Conversations">
              <div className="space-y-2">
                {conversations.data.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full rounded-xl border p-3 text-left ${activeId === conversation.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-white'}`}
                  >
                    <p className="font-bold text-helixed-navy">
                      {conversation.teacher.displayName}
                    </p>
                    <p className="text-xs font-semibold text-blue-700">
                      {conversation.contexts.map((context) => context.childName).join(', ')}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {conversation.preview ?? 'No messages yet.'}
                    </p>
                  </button>
                ))}
              </div>
            </DashboardCard>
            {detail.isLoading ? (
              <DashboardCard title="Conversation">Loading messages…</DashboardCard>
            ) : detail.isError || !detail.data ? (
              <DashboardCard title="Conversation unavailable">
                <p className="text-sm text-rose-600">
                  This conversation is unavailable in your current relationship context.
                </p>
              </DashboardCard>
            ) : (
              <Conversation detail={detail.data} currentUserId={user?.id ?? ''} />
            )}
          </div>
        ) : (
          <section className="mt-5">
            <DashboardCard title="No authorized conversations">
              <p className="text-sm text-slate-600">
                No Parent conversations are currently available through your verified child and
                teacher relationships.
              </p>
            </DashboardCard>
          </section>
        )}
      </div>
    </main>
  );
}

function Conversation({
  detail,
  currentUserId,
}: {
  detail: Awaited<ReturnType<typeof parentMessagesApi.detail>>;
  currentUserId: string;
}) {
  const { accessToken } = useAuth();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => parentMessagesApi.send(accessToken!, detail.id, body),
    onSuccess: () => {
      setBody('');
      void client.invalidateQueries({ queryKey: ['parent-messages'] });
    },
  });
  return (
    <DashboardCard title={detail.teacher.displayName}>
      <div className="border-b border-slate-100 pb-3 text-sm text-slate-500">
        {detail.contexts.map((context) => (
          <p key={`${context.childId}-${context.className}`}>
            Teacher for {context.childName} · {context.className} · {context.schoolName}
          </p>
        ))}
      </div>
      <div className="min-h-80 space-y-3 py-4">
        {detail.messages.length ? (
          detail.messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-xl rounded-2xl p-3 text-sm ${message.sender.id === currentUserId ? 'ml-auto bg-blue-100 text-blue-950' : 'bg-slate-100 text-slate-700'}`}
            >
              <p>{message.body}</p>
              <p className="mt-1 text-xs opacity-60">
                {message.sender.displayName} · {format(message.createdAt)}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No messages yet.</p>
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) send.mutate();
        }}
      >
        <input
          aria-label="Message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder="Write a message…"
          className="min-w-0 flex-1 rounded-xl border border-blue-100 p-3"
        />
        <button
          type="submit"
          disabled={send.isPending || !body.trim()}
          className="rounded-xl bg-blue-600 px-5 font-semibold text-white disabled:opacity-50"
        >
          {send.isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
      {send.isError ? <p className="mt-2 text-sm text-rose-600">Message was not sent.</p> : null}
    </DashboardCard>
  );
}
