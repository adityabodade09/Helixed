import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { DashboardCard } from '../student-dashboard/StudentDashboardPage';
import { parentDocumentsApi } from './parentDocuments.api';

const formatSize = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(
    new Date(value),
  );

export function ParentDocumentsPage() {
  const { accessToken } = useAuth();
  const [childId, setChildId] = useState<string>();
  const documents = useQuery({
    queryKey: ['parent-documents', childId],
    queryFn: () => parentDocumentsApi.get(accessToken!, childId),
    enabled: !!accessToken,
  });

  if (documents.isLoading)
    return <main className="min-h-screen bg-slate-50 p-6">Loading documents…</main>;
  if (documents.isError || !documents.data)
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-rose-600">
        Documents are unavailable for this account.
      </main>
    );

  const data = documents.data;
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-blue-50 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-blue-600">Parent › Documents</p>
              <h1 className="mt-1 text-3xl font-black text-helixed-navy md:text-4xl">Documents</h1>
              <p className="mt-2 text-slate-600">
                Parent-provided supporting records for one authorized child at a time.
              </p>
            </div>
            <select
              aria-label="Child"
              value={data.child.id}
              onChange={(event) => setChildId(event.target.value)}
              className="rounded-xl border border-blue-100 bg-white p-3 font-semibold text-helixed-navy"
            >
              {data.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.displayName ?? 'Student'}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h2 className="font-bold text-helixed-navy">Secure file storage is not connected</h2>
          <p className="mt-1 text-sm text-slate-600">
            This workspace currently shows approved metadata only. Upload, preview, and download
            remain unavailable until private object storage and file-security checks are active.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-2xl font-black text-helixed-navy">
            Records for {data.child.displayName}
          </h2>
          {data.documents.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.documents.map((document) => (
                <DashboardCard key={document.id} title={document.displayName}>
                  <dl className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between gap-4">
                      <dt>Child</dt>
                      <dd className="font-semibold text-helixed-navy">
                        {document.child.displayName}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>File metadata</dt>
                      <dd className="text-right font-semibold text-helixed-navy">
                        {document.fileName} · {formatSize(document.sizeBytes)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Added by</dt>
                      <dd>{document.uploader.displayName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Registered</dt>
                      <dd>{formatDate(document.createdAt)}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                    Metadata only · file unavailable
                  </p>
                </DashboardCard>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <DashboardCard title="No Parent-visible documents">
                <p className="text-sm text-slate-600">
                  No permitted document records are available for this child.
                </p>
              </DashboardCard>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
