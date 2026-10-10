import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiRequest } from '../../services/api/apiClient';
import { useAuth } from '../auth/useAuth';
import { StudentShell } from '../student-dashboard/StudentShell';
type Conversation = { id: string; messages: Array<{ id: string; role: string; content: string }> };
const features = [
  'chat',
  'doubt',
  'study-plan',
  'revision',
  'daily-plan',
  'workload',
  'opportunities',
  'career',
  'documents',
  'certificates',
  'achievements',
  'insights',
];
export function StudentAiPage({ feature = 'chat' }: { feature?: string }) {
  const { accessToken, user } = useAuth();
  const [id, setId] = useState<string>();
  const [prompt, setPrompt] = useState('');
  const q = useQuery<Conversation | null>({
    queryKey: ['ai', id],
    queryFn: () =>
      id
        ? apiRequest<Conversation>(`/student/ai/conversations/${id}`, { accessToken: accessToken! })
        : Promise.resolve(null),
    enabled: !!accessToken,
  });
  const m = useMutation({
    mutationFn: () =>
      apiRequest<Conversation>(`/student/ai/${feature}`, {
        accessToken: accessToken!,
        method: 'POST',
        body: { prompt, conversationId: id },
      }),
    onSuccess: (x) => {
      setId(x.id);
      setPrompt('');
    },
  });
  return (
    <StudentShell studentName={user?.displayName ?? 'Student'}>
      <div className="mx-auto max-w-[1100px] p-4 md:p-6">
        <h1 className="text-3xl font-black text-helixed-navy">Helix AI</h1>
        <p className="text-slate-500">
          Private guidance based on the minimum necessary records. It cannot change your data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {features.map((x) => (
            <a
              key={x}
              href={`/student/ai/${x === 'chat' ? '' : x}`}
              className={`rounded-xl px-3 py-2 text-sm ${feature === x ? 'bg-blue-600 text-white' : 'border border-blue-100 text-blue-700'}`}
            >
              {x.replace('-', ' ')}
            </a>
          ))}
        </div>
        <main className="mt-4 rounded-2xl border border-slate-100 bg-white p-5">
          <div className="min-h-80 space-y-3">
            {q.isLoading ? <p className="text-slate-500">Loading conversation…</p> : null}
            {q.isError ? (
              <p className="text-rose-600">Your conversation could not be loaded.</p>
            ) : null}
            {!q.isLoading && !q.isError && (q.data?.messages?.length ?? 0) === 0 ? (
              <p className="text-slate-500">Ask for help with {feature.replace('-', ' ')}.</p>
            ) : null}
            {q.data?.messages?.map((x) => (
              <p
                key={x.id}
                className={
                  x.role === 'assistant'
                    ? 'rounded-xl bg-blue-50 p-3'
                    : 'ml-auto max-w-xl rounded-xl bg-slate-100 p-3'
                }
              >
                {x.content}
              </p>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) m.mutate();
            }}
          >
            <input
              aria-label="AI prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              className="flex-1 rounded-xl border border-blue-100 p-3"
              placeholder="Ask Helix AI…"
            />
            <button className="rounded-xl bg-blue-600 px-5 text-white">Send</button>
          </form>
          {m.isError ? <p className="mt-2 text-rose-600">AI is unavailable. Try again.</p> : null}
        </main>
      </div>
    </StudentShell>
  );
}
