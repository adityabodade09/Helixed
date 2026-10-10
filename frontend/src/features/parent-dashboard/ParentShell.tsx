import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  ['Dashboard', '/parent'],
  ['Children', '/parent/children'],
  ['Messages', '/parent/messages'],
  ['Approvals', '/parent/approvals'],
  ['Insights', '/parent/insights'],
  ['Documents', '/parent/documents'],
  ['Opportunities', '/parent/opportunities'],
] as const;

export function ParentShell({ children, parentName }: PropsWithChildren<{ parentName: string }>) {
  const location = useLocation();
  const firstName = parentName.split(' ')[0] || 'Parent';
  return (
    <div className="min-h-screen bg-[#fbfdff] text-slate-800">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-slate-100 bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 via-cyan-400 to-orange-400 text-lg font-black text-white">
            H
          </span>
          <div>
            <p className="text-2xl font-black tracking-tight text-helixed-navy">Helixed</p>
            <p className="text-[9px] font-semibold text-helixed-blue">Unfold the Unknown.</p>
          </div>
        </div>
        <nav aria-label="Parent navigation" className="space-y-1">
          {navigation.map(([label, href]) => {
            const active =
              href === '/parent' ? location.pathname === href : location.pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span className="grid size-5 place-items-center rounded-md border border-current text-[10px]">
                  {label[0]}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-7 border-t border-slate-100 pt-5">
          <Link
            to="/parent/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${location.pathname === '/parent/settings' ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-500'}`}
          >
            <span>⚙</span>Settings
          </Link>
        </div>
      </aside>
      <main className="lg:ml-56">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-5 backdrop-blur lg:px-8">
          <span className="text-xl font-black text-helixed-navy lg:hidden">Helixed Parent</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">
              {firstName[0]}
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-helixed-navy">{parentName}</p>
              <p className="text-xs text-slate-500">Parent / Guardian</p>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
