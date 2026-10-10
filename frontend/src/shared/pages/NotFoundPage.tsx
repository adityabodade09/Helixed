import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-helixed-navy">Page not found</h1>
      <p className="mt-3 text-slate-600">The requested route is not available.</p>
      <Link className="mt-6 inline-block font-semibold text-helixed-blue" to="/">
        Return home
      </Link>
    </section>
  );
}
