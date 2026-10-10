import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  ['Dashboard', '/teacher'],
  ['Classes', '/teacher/classes'],
  ['Students', '/teacher/students'],
  ['Attendance', '/teacher/attendance'],
  ['Assignments', '/teacher/assignments'],
  ['Marks', '/teacher/marks'],
  ['Class Summary', '/teacher/class-summary'],
  ['Development', '/teacher/development'],
  ['Opportunities', '/teacher/opportunities'],
  ['Messages', '/teacher/messages'],
  ['Documents', null],
] as const;

export function TeacherShell({
  children,
  teacherName,
}: PropsWithChildren<{ teacherName: string }>) {
  const location = useLocation();
  const firstName = teacherName.split(' ')[0] || 'Teacher';
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
        <nav aria-label="Teacher navigation" className="space-y-1">
          {navigation.map(([label, href]) => {
            const content = (
              <>
                <span className="grid size-5 place-items-center rounded-md border border-current text-[10px]">
                  {label[0]}
                </span>
                {label}
              </>
            );
            const active =
              href === '/teacher/classes' ||
              href === '/teacher/students' ||
              href === '/teacher/assignments' ||
              href === '/teacher/marks' ||
              href === '/teacher/messages'
                ? location.pathname === href || location.pathname.startsWith(`${href}/`)
                : location.pathname === href;
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
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm">
          <Link
            to="/teacher/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              location.pathname === '/teacher/settings'
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-slate-500'
            }`}
          >
            <span>⚙</span>Settings
          </Link>
        </div>
      </aside>
      <main className="lg:ml-56">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-5 backdrop-blur lg:px-8">
          <span className="text-xl font-black text-helixed-navy lg:hidden">Helixed Teacher</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-violet-100 font-bold text-violet-700">
              {firstName[0]}
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-helixed-navy">{teacherName}</p>
              <p className="text-xs text-slate-500">Teacher</p>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
