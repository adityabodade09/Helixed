import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { StudentShell } from '../student-dashboard/StudentShell';
import {
  communityApi,
  type CommunityGroup,
  type Conversation,
  type ConversationDetail,
  type Message,
} from './studentCommunity.api';

type Page = 'inbox' | 'sent' | 'groups' | 'direct';
const tabs: Array<[string, string]> = [
  ['Inbox', '/student/community/inbox'],
  ['Sent', '/student/community/sent'],
  ['Direct', '/student/community/direct'],
  ['Groups', '/student/community/groups'],
];
const format = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
function State({ children }: PropsWithChildren) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-600">
      {children}
    </main>
  );
}
function Frame({ children, active }: PropsWithChildren<{ active: Page }>) {
  const { user } = useAuth();
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6">
        <section className="rounded-2xl border border-blue-50 bg-white px-5 py-5">
          <p className="text-xs font-semibold text-blue-700">Student › Community</p>
          <h1 className="mt-2 text-3xl font-black text-helixed-navy">
            {active === 'direct' ? 'Direct' : active[0].toUpperCase() + active.slice(1)}
          </h1>
          <p className="text-slate-500">A safe place to connect with your school communities.</p>
          <nav className="mt-5 flex flex-wrap gap-2">
            {tabs.map(([name, to]) => (
              <Link
                key={to}
                to={to}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${active === name.toLowerCase() ? 'bg-blue-600 text-white' : 'border border-blue-100 text-blue-700'}`}
              >
                {name}
              </Link>
            ))}
          </nav>
        </section>
        <div className="mt-4">{children}</div>
      </div>
    </StudentShell>
  );
}
function QueryState<T>({
  query,
  children,
}: {
  query: ReturnType<typeof useQuery<T>>;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <State>Loading Community…</State>;
  if (query.isError)
    return (
      <State>
        <div>
          <h1 className="text-xl font-bold text-helixed-navy">Community is unavailable</h1>
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
export function StudentCommunityPage({ page = 'inbox' }: { page?: Page }) {
  const { accessToken } = useAuth();
  const query = useQuery<Conversation[] | Message[] | CommunityGroup[]>({
    queryKey: ['student-community', page],
    queryFn: () =>
      page === 'sent'
        ? communityApi.sent(accessToken!)
        : page === 'groups'
          ? communityApi.groups(accessToken!)
          : page === 'direct'
            ? communityApi.direct(accessToken!)
            : communityApi.inbox(accessToken!),
    enabled: !!accessToken,
  });
  const client = useQueryClient();
  const join = useMutation({
    mutationFn: (id: string) => communityApi.join(accessToken!, id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['student-community'] }),
  });
  return (
    <QueryState query={query}>
      {(data) => (
        <Frame active={page}>
          {page === 'groups' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(data as Awaited<ReturnType<typeof communityApi.groups>>).length ? (
                (data as Awaited<ReturnType<typeof communityApi.groups>>).map((group) => (
                  <DashboardCard key={group.id} title={group.name}>
                    <p className="min-h-12 text-sm text-slate-500">
                      {group.description ?? 'Community group'}
                    </p>
                    <p className="mt-4 text-xs text-slate-500">
                      {group.memberCount} members · {group.visibility.replace('_', ' ')}
                    </p>
                    <div className="mt-4 flex gap-2">
                      {group.joined ? (
                        <Link
                          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                          to={`/student/community/groups/${group.id}`}
                        >
                          Open group
                        </Link>
                      ) : (
                        <button
                          disabled={join.isPending}
                          onClick={() => join.mutate(group.id)}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Join group
                        </button>
                      )}
                    </div>
                  </DashboardCard>
                ))
              ) : (
                <p className="text-slate-500">No communities are available.</p>
              )}
            </div>
          ) : page === 'sent' ? (
            <DashboardCard title="Sent messages">
              <div className="space-y-3">
                {(data as Awaited<ReturnType<typeof communityApi.sent>>).length ? (
                  (data as Awaited<ReturnType<typeof communityApi.sent>>).map((message) => (
                    <article key={message.id} className="rounded-xl border border-slate-100 p-3">
                      <p className="text-sm text-helixed-navy">{message.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{format(message.createdAt)}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">You have not sent any messages.</p>
                )}
              </div>
            </DashboardCard>
          ) : (
            <ConversationList
              conversations={data as Awaited<ReturnType<typeof communityApi.inbox>>}
              direct={page === 'direct'}
            />
          )}
        </Frame>
      )}
    </QueryState>
  );
}
function ConversationList({
  conversations,
  direct,
}: {
  conversations: Awaited<ReturnType<typeof communityApi.inbox>>;
  direct: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <DashboardCard title={direct ? 'Direct conversations' : 'Inbox'}>
        <input
          aria-label="Search conversations"
          placeholder="Search conversations…"
          className="mb-3 w-full rounded-xl border border-blue-100 p-3"
        />{' '}
        <div className="space-y-2">
          {conversations.length ? (
            conversations.map((item) => (
              <Link
                key={item.id}
                to={
                  direct
                    ? `/student/community/direct/${item.id}`
                    : item.kind === 'group'
                      ? `/student/community/groups/${item.groupId}`
                      : `/student/community/direct/${item.id}`
                }
                className="block rounded-xl border border-slate-100 p-3 hover:border-blue-300"
              >
                <p className="font-bold text-helixed-navy">{item.title}</p>
                <p className="truncate text-sm text-slate-500">
                  {item.preview ?? 'No messages yet.'}
                </p>
                <p className="mt-1 text-xs text-slate-400">{format(item.updatedAt)}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">No conversations yet.</p>
          )}
        </div>
      </DashboardCard>
      <DashboardCard title="Safe Community">
        <p className="text-sm text-slate-500">
          Only conversations and groups you belong to are visible here.
        </p>
      </DashboardCard>
    </div>
  );
}
function Conversation({ detail, active }: { detail: ConversationDetail; active: Page }) {
  const { accessToken, user } = useAuth();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const mutation = useMutation({
    mutationFn: () => communityApi.send(accessToken!, detail.id, body),
    onSuccess: () => {
      setBody('');
      void client.invalidateQueries({ queryKey: ['student-community'] });
    },
  });
  return (
    <Frame active={active}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <DashboardCard title={detail.title}>
          <div className="min-h-96 space-y-4">
            {detail.messages.length ? (
              detail.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-xl rounded-2xl p-3 text-sm ${message.sender.id === user?.id ? 'ml-auto bg-blue-100 text-blue-950' : 'bg-slate-100 text-slate-700'}`}
                >
                  <p>{message.body}</p>
                  <p className="mt-1 text-xs opacity-60">
                    {message.sender.displayName} · {format(message.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No messages yet.</p>
            )}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (body.trim()) mutation.mutate();
            }}
          >
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-xl border border-blue-100 p-3"
            />
            <button
              disabled={mutation.isPending}
              className="rounded-xl bg-blue-600 px-4 font-semibold text-white"
            >
              Send
            </button>
          </form>
          {mutation.isError ? (
            <p className="mt-2 text-sm text-rose-600">Could not send message.</p>
          ) : null}
        </DashboardCard>
        <DashboardCard title="Conversation privacy">
          <p className="text-sm text-slate-500">
            Messages are available only to authenticated conversation members.
          </p>
        </DashboardCard>
      </div>
    </Frame>
  );
}
export function StudentCommunityGroupPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-community', 'group', id],
    queryFn: () => communityApi.group(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  return (
    <QueryState query={query}>
      {(detail) => <Conversation detail={detail} active="groups" />}
    </QueryState>
  );
}
export function StudentCommunityDirectPage() {
  const { accessToken } = useAuth();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-community', 'direct', id],
    queryFn: () => communityApi.directDetail(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
  return (
    <QueryState query={query}>
      {(detail) => <Conversation detail={detail} active="direct" />}
    </QueryState>
  );
}
