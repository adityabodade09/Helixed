import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import loginReference from '../../../../design/ChatGPT Image Sep 30, 2026, 01_59_22 PM.png';
import { useAuth } from './useAuth';

const roles = [
  { id: 'student', label: 'Student', color: '#0877ff', destination: '/student' },
  { id: 'parent', label: 'Parent', color: '#ff641e', destination: '/parent' },
  { id: 'teacher', label: 'Teacher', color: '#8927e8', destination: '/teacher' },
  { id: 'academy', label: 'Academy', color: '#0dbf68', destination: '/academy' },
  { id: 'school', label: 'School', color: '#0877ff', destination: '/' },
] as const;

type RoleId = (typeof roles)[number]['id'];

const roleCopy: Record<RoleId, { account: string; placeholder: string; help: string }> = {
  student: {
    account: 'School-issued account',
    placeholder: 'Enter your school email or account ID',
    help: 'Student account help',
  },
  parent: {
    account: 'Parent account',
    placeholder: 'Enter your email or account ID',
    help: 'Parent account help',
  },
  teacher: {
    account: 'School-issued account',
    placeholder: 'Enter your school email or account ID',
    help: 'Teacher account help',
  },
  academy: {
    account: 'Academy-issued account',
    placeholder: 'Enter your academy email or account ID',
    help: 'Academy account help',
  },
  school: {
    account: 'School administrator account',
    placeholder: 'Enter your school email or account ID',
    help: 'School account help',
  },
};

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleId>('student');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);

  const requested = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const rememberedDestination = sessionStorage.getItem('helixed-portal-destination');

  if (auth.status === 'authenticated')
    return <Navigate to={requested ?? rememberedDestination ?? '/student'} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || role === 'school') return;
    pending.current = true;
    setSubmitting(true);
    setError(null);

    try {
      await auth.login(loginIdentifier, password);
      const selected = roles.find((item) => item.id === role)!;
      if (selected.destination === '/') sessionStorage.removeItem('helixed-portal-destination');
      else sessionStorage.setItem('helixed-portal-destination', selected.destination);
      navigate(requested ?? selected.destination, { replace: true });
    } catch {
      setError('Unable to sign in with those credentials.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  const copy = roleCopy[role];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6faff] text-[#06134f] lg:grid lg:grid-cols-[55%_45%]">
      <section
        className="relative hidden min-h-screen overflow-hidden lg:block"
        aria-label="Helixed welcome"
      >
        <img
          src={loginReference}
          alt="Students walking toward a bright school campus on their connected Helixed journey"
          className="absolute inset-0 h-full w-[182%] max-w-none"
        />
      </section>

      <section className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_35%_10%,#ffffff_0%,#f7fbff_55%,#eef7ff_100%)] px-4 py-8 sm:px-8 lg:px-10">
        <div className="absolute right-8 top-7 hidden items-center gap-5 text-sm xl:flex">
          <span className="text-[#172058]">New to Helixed?</span>
          <span
            className="rounded-full border-2 border-[#0877ff] px-8 py-3 font-bold text-[#0765dc]"
          >
            Contact your institution
          </span>
        </div>

        <div className="w-full max-w-[655px] rounded-[22px] border border-white/90 bg-white/95 p-6 shadow-[0_24px_70px_rgba(20,77,150,0.08)] sm:p-9 lg:mt-12 xl:p-12">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-400 to-orange-400 text-2xl font-black text-white">
              H
            </span>
            <div>
              <p className="text-2xl font-black">Helixed</p>
              <p className="text-sm text-[#1671ee]">Unfold the Unknown.</p>
            </div>
          </div>

          <h1 className="text-[clamp(2.2rem,3.4vw,3.7rem)] font-black leading-[1.04] tracking-[-0.045em] text-[#070d55]">
            Sign in to Helixed
          </h1>
          <p className="mt-2 text-xl text-[#6670aa] sm:text-2xl">Choose your role and continue.</p>

          <div className="mt-7 grid grid-cols-5 gap-2 sm:gap-3" aria-label="Choose your role">
            {roles.map((item) => {
              const selected = role === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={item.id === 'school'}
                  title={item.id === 'school' ? 'School administrator portal is not available yet' : undefined}
                  onClick={() => setRole(item.id)}
                  className={`flex min-w-0 flex-col items-center rounded-xl border px-1 py-4 transition ${selected ? 'border-[#0877ff] bg-[#f7fbff] shadow-[0_0_0_1px_#0877ff]' : 'border-[#dce6f4] bg-white hover:border-[#a9caff]'}`}
                >
                  <RoleIcon role={item.id} color={item.color} />
                  <span className="mt-3 text-xs font-extrabold text-[#080d4d] sm:text-base">
                    {item.label}{item.id === 'school' ? ' (soon)' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#edf5ff] px-5 py-4 text-sm text-[#5967a1] sm:text-base">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0877ff] font-black text-white">
              i
            </span>
            Use your institution-issued account provided by your school or academy.
          </div>

          <form className="mt-6 space-y-5" onSubmit={submit}>
            <label className="block font-bold text-[#070d4f]">
              {copy.account} <span className="text-red-500">*</span>
              <span className="mt-2 flex h-[54px] items-center rounded-xl border border-[#ccd9eb] bg-white px-4 focus-within:border-[#0877ff] focus-within:ring-2 focus-within:ring-blue-100">
                <MailIcon />
                <input
                  aria-label="Login identifier"
                  autoComplete="username"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-base font-normal text-[#11184e] outline-none placeholder:text-[#8a94bc]"
                  onChange={(event) => setLoginIdentifier(event.target.value)}
                  placeholder={copy.placeholder}
                  required
                  value={loginIdentifier}
                />
              </span>
            </label>

            <label className="block font-bold text-[#070d4f]">
              Password <span className="text-red-500">*</span>
              <span className="mt-2 flex h-[54px] items-center rounded-xl border border-[#ccd9eb] bg-white px-4 focus-within:border-[#0877ff] focus-within:ring-2 focus-within:ring-blue-100">
                <LockIcon />
                <input
                  aria-label="Password"
                  autoComplete="current-password"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-base font-normal text-[#11184e] outline-none placeholder:text-[#8a94bc]"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="grid size-9 place-items-center text-[#6573a8]"
                >
                  <EyeIcon />
                </button>
              </span>
            </label>

            <p className="text-sm text-[#5967a1]">
              Forgot your password? Contact your institution administrator. Self-service recovery is not available yet.
            </p>

            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            ) : null}

            <button
              aria-label="Sign in"
              className="h-[54px] w-full rounded-xl bg-[#086cf3] text-lg font-extrabold text-white shadow-[0_8px_20px_rgba(8,108,243,0.24)] hover:bg-[#005fdd] disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Signing in…' : 'Sign in'}{' '}
              <span aria-hidden="true" className="ml-4">
                →
              </span>
            </button>
          </form>

          <div className="my-5 flex items-center gap-4 text-sm text-[#6573a8]">
            <span className="h-px flex-1 bg-[#d8e2ef]" /> or{' '}
            <span className="h-px flex-1 bg-[#d8e2ef]" />
          </div>

          <button
            type="button"
            disabled
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-[#ccd9eb] bg-white font-semibold text-[#11184e] disabled:opacity-100"
          >
            <span className="text-xl font-black text-[#4285f4]">G</span>
            Google sign-in is not available yet
          </button>

          <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#edf5ff] px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#0877ff] text-xl font-black text-[#0877ff]">
              ?
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-[#070d4f]">Having trouble signing in?</p>
              <p className="mt-1 text-sm text-[#6873a6]">Get help with your {role} account.</p>
            </div>
            <span
              className="shrink-0 text-sm font-extrabold text-[#0069ed] sm:text-base"
            >
              Contact your institution
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function RoleIcon({ role, color }: { role: RoleId; color: string }) {
  return (
    <span
      style={{ color, backgroundColor: `${color}12` }}
      className="grid size-10 place-items-center rounded-full text-lg font-black sm:size-12"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {role === 'student' ? (
          <>
            <path d="m3 9 9-5 9 5-9 5-9-5Z" />
            <path d="M7 11.5V16c2.7 2 7.3 2 10 0v-4.5M21 9v6" />
          </>
        ) : role === 'parent' ? (
          <>
            <circle cx="9" cy="8" r="3" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M3.5 19c.3-4 2.2-6 5.5-6s5.2 2 5.5 6M14 14c3.7-.4 5.8 1.3 6.2 5" />
          </>
        ) : role === 'teacher' ? (
          <>
            <circle cx="12" cy="7" r="3" />
            <path d="M6 20c.4-4.7 2.4-7 6-7s5.6 2.3 6 7H6Z" />
            <path d="M8.5 20v-2h7v2" />
          </>
        ) : role === 'academy' ? (
          <>
            <circle cx="15" cy="5" r="2.2" />
            <path d="m13.5 8-3 4 3 2 2.5 5M10.5 12 7 10M13.5 14l4-2M10 19l-3 1" />
          </>
        ) : (
          <>
            <path d="M4 21V8l8-4 8 4v13M2 21h20M8 11v2M12 11v2M16 11v2M8 16v2M16 16v2M11 21v-5h2v5" />
          </>
        )}
      </svg>
    </span>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 text-[#7380ae]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 text-[#7380ae]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
