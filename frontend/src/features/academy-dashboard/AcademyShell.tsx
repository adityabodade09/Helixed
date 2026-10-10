import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  ['Dashboard', '/academy'],
  ['Students', '/academy/students'],
  ['Batches', '/academy/batches'],
  ['Coaches', '/academy/coaches'],
  ['Certificates', null],
  ['Messages', null],
  ['Opportunities', null],
  ['Documents', null],
  ['Settings', '/academy/settings'],
] as const;

export function AcademyShell({
  academyName,
  children,
}: PropsWithChildren<{ academyName: string }>) {
  const location = useLocation();
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
        <nav aria-label="Academy navigation" className="space-y-1">
          {navigation.map(([label, href]) => {
            const active =
              href !== null &&
              (location.pathname === href ||
                (href !== '/academy' && location.pathname.startsWith(`${href}/`)));
            const content = (
              <>
                <span className="grid size-5 place-items-center rounded-md border border-current text-[10px]">
                  {label[0]}
                </span>
                {label}
              </>
            );
            return href ? (
              <Link
                key={label}
                to={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
              >
                {content}
              </Link>
            ) : (
              <span
                key={label}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
              >
                {content}
              </span>
            );
          })}
        </nav>
      </aside>
      <main className="lg:ml-56">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-5 backdrop-blur lg:px-8">
          <span className="text-xl font-black text-helixed-navy lg:hidden">Helixed Academy</span>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-helixed-navy">{academyName}</p>
            <p className="text-xs text-slate-500">Academy workspace</p>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
