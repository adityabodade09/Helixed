import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'An unexpected application error occurred.';

  return (
    <main className="mx-auto max-w-3xl px-6 py-20" role="alert">
      <h1 className="text-3xl font-bold text-helixed-navy">Something went wrong</h1>
      <p className="mt-3 text-slate-600">{message}</p>
    </main>
  );
}
