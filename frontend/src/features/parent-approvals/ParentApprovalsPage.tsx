import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { useAuth } from '../auth/useAuth';
import {
  parentApprovalsApi,
  type ParentApproval,
  type ParentApprovalStatus,
} from './parentApprovals.api';

type Filter = 'PENDING' | 'DECIDED' | 'ALL';
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  );

export function ParentApprovalsPage() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<Filter>('PENDING');
  const approvals = useQuery({
    queryKey: ['parent-approvals'],
    queryFn: () => parentApprovalsApi.list(accessToken!),
    enabled: !!accessToken,
  });

  if (approvals.isLoading)
    return <main className="min-h-screen bg-slate-50 p-6">Loading approvals…</main>;
  if (approvals.isError || !approvals.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Approvals are unavailable for this account.
      </main>
    );

  const pending = approvals.data.filter((approval) => approval.status === 'PENDING').length;
  const visible = approvals.data.filter((approval) =>
    filter === 'ALL'
      ? true
      : filter === 'PENDING'
        ? approval.status === 'PENDING'
        : approval.status !== 'PENDING',
  );

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">Parent › Approvals</p>
          <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Approvals</h1>
          <p className="mt-2 text-slate-600">Review requests separately for each verified child.</p>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <Summary label="Pending" value={pending} tone="amber" />
          <Summary label="Decided" value={approvals.data.length - pending} tone="blue" />
          <Summary label="All requests" value={approvals.data.length} tone="slate" />
        </section>

        <nav className="mt-5 flex gap-2" aria-label="Approval filters">
          {(['PENDING', 'DECIDED', 'ALL'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${filter === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
            >
              {item === 'PENDING' ? 'Pending' : item === 'DECIDED' ? 'Decided' : 'All'}
            </button>
          ))}
        </nav>

        <section className="mt-5 space-y-4">
          {visible.length ? (
            visible.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onDecided={() => setFilter('ALL')}
              />
            ))
          ) : (
            <DashboardCard title={filter === 'PENDING' ? 'No pending approvals' : 'No approvals'}>
              <p className="text-sm text-slate-600">
                {approvals.data.length
                  ? 'There are no requests in this view.'
                  : 'No approval requests are currently available for your verified children.'}
              </p>
            </DashboardCard>
          )}
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  const colors =
    tone === 'amber'
      ? 'border-amber-100 bg-amber-50 text-amber-800'
      : tone === 'blue'
        ? 'border-blue-100 bg-blue-50 text-blue-800'
        : 'border-slate-200 bg-white text-slate-700';
  return (
    <div className={`rounded-2xl border p-5 ${colors}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function ApprovalCard({
  approval,
  onDecided,
}: {
  approval: ParentApproval;
  onDecided: () => void;
}) {
  const { accessToken } = useAuth();
  const client = useQueryClient();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [success, setSuccess] = useState<ParentApprovalStatus>();
  const decision = useMutation({
    mutationFn: (value: 'APPROVED' | 'DECLINED') =>
      parentApprovalsApi.decide(accessToken!, approval.id, value),
    onSuccess: (updated) => {
      setSuccess(updated.status);
      setConfirmDecline(false);
      client.setQueryData<ParentApproval[]>(['parent-approvals'], (items = []) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      onDecided();
    },
  });

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {approval.child.displayName}
            </span>
            <Status status={approval.status} />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            Opportunity application
          </p>
          <h2 className="mt-1 text-xl font-black text-helixed-navy">{approval.target.title}</h2>
          {approval.target.detail ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{approval.target.detail}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            {approval.target.category ? <span>{approval.target.category}</span> : null}
            <span>Requested {date(approval.requestedAt)}</span>
            {approval.target.deadline ? (
              <span>Deadline {date(approval.target.deadline)}</span>
            ) : null}
          </div>
        </div>

        {approval.status === 'PENDING' ? (
          <div className="flex min-w-48 flex-col gap-2">
            {!approval.targetAvailable ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                This request is no longer available.
              </p>
            ) : confirmDecline ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-800">Decline this request?</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => decision.mutate('DECLINED')}
                    disabled={decision.isPending}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {decision.isPending ? 'Declining…' : 'Confirm decline'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDecline(false)}
                    disabled={decision.isPending}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => decision.mutate('APPROVED')}
                  disabled={decision.isPending}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {decision.isPending ? 'Saving…' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDecline(true)}
                  disabled={decision.isPending}
                  className="rounded-xl border border-rose-200 px-5 py-3 font-bold text-rose-700 disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">
            Decided {approval.resolvedAt ? date(approval.resolvedAt) : ''}
          </p>
        )}
      </div>
      {success ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          Decision saved: {success === 'APPROVED' ? 'approved' : 'declined'}.
        </p>
      ) : null}
      {decision.isError ? (
        <p className="mt-4 text-sm font-semibold text-rose-600">
          This decision could not be saved. Refresh to check the current request status.
        </p>
      ) : null}
    </article>
  );
}

function Status({ status }: { status: ParentApprovalStatus }) {
  const color =
    status === 'PENDING'
      ? 'bg-amber-50 text-amber-700'
      : status === 'APPROVED'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-rose-50 text-rose-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${color}`}>{status}</span>;
}
