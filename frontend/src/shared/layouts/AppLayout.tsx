import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <span className="text-xl font-bold tracking-tight text-helixed-navy">HELIXED</span>
          <span className="ml-3 text-sm text-slate-500">Unfold the Unknown</span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
