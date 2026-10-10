import { Link, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

const navigation = [
  ['Home', '/student'],
  ['Academics', '/student/academics'],
  ['Schedule', '/student/academics/schedule'],
  ['Tasks', '/student/academics/tasks'],
  ['Activities', '/student/activities'],
  ['Calendar', '/student/calendar'],
  ['Opportunities', '/student/opportunities'],
  ['Community', '/student/community'],
  ['Growth', '/student/growth'],
  ['Helix AI', '/student/ai'],
  ['Focus', '#'],
  ['Documents', '#'],
  ['Profile', '#'],
] as const;

export function StudentShell({
  children,
  studentName,
  taskCount = 0,
}: PropsWithChildren<{ studentName: string; taskCount?: number }>) {
  const location = useLocation();
  const firstName = studentName.split(' ')[0] || 'Student';
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
        <nav aria-label="Student navigation" className="space-y-1">
          {navigation.map(([item, href]) => {
            const active =
              href !== '#' &&
              (href === '/student'
                ? location.pathname === href
                : location.pathname.startsWith(href));
            const content = (
              <>
                <span className="grid size-5 place-items-center rounded-md border border-current text-[10px]">
                  {item[0]}
                </span>
                {item}
                {item === 'Tasks' && taskCount > 0 ? (
                  <span className="ml-auto grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] text-white">
                    {taskCount}
                  </span>
                ) : null}
              </>
            );
            return href === '#' ? (
              <span
                key={item}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
              >
                {content}
              </span>
            ) : (
              <Link
                key={item}
                to={href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {content}
              </Link>
            );
          })}
        </nav>
        <div className="mt-7 border-t border-slate-100 pt-5">
          <Link
            to="/student/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-500"
          >
            <span>⚙</span>Settings
          </Link>
        </div>
      </aside>
      <main className="lg:ml-56">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-5 backdrop-blur lg:px-8">
          <label className="hidden w-full max-w-xl lg:block">
            <span className="sr-only">Search</span>
            <input
              className="w-full rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
              placeholder="Search classes, notes, assignments, opportunities..."
            />
          </label>
          <div className="flex w-full items-center justify-between lg:w-auto lg:gap-7">
            <span className="text-xl font-black text-helixed-navy lg:hidden">Helixed</span>
            <div className="ml-auto flex items-center gap-4">
              <button aria-label="Notifications" className="text-lg text-helixed-navy">
                ♧
              </button>
              <button
                aria-label="Help"
                className="grid size-7 place-items-center rounded-full border text-sm text-helixed-navy"
              >
                ?
              </button>
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-700">
                  {firstName[0]}
                </span>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-helixed-navy">{studentName}</p>
                  <p className="text-xs text-slate-500">Student</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
