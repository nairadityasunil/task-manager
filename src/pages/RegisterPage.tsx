import { FormEvent, type ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import api, { API_BASE_URL } from '@/services/api';
import logoImg from '@/assets/logo.png';
import GoogleLogo from '@/components/GoogleLogo';
import { buttonClass, cn, inputClass } from '@/components/ui';

// Keep in sync with the brand panel in LoginPage.tsx.
/** 40px-tall controls for the auth forms. */
const inputCls = inputClass.replace('h-9', 'h-10');
const labelCls = 'grid gap-1.5 text-sm font-medium text-slate-700';
const primaryBtn = buttonClass('primary', 'md', 'w-full').replace('h-9', 'h-10');
const secondaryBtn = buttonClass('secondary', 'md', 'w-full').replace('h-9', 'h-10');
const toggleBtn =
  'absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15';

const VALUE_POINTS = [
  'Projects, epics and tasks with priorities that update themselves',
  'Response and resolution SLAs tracked on every task',
  'Guides, surveys and events for your own product'
];

/** Inline form error, kept next to the form it belongs to. */
function FormError({ children }: { children: string }): JSX.Element {
  return (
    <p className="m-0 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
      <AlertCircle className="mt-0.5 shrink-0" size={14} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function FormHeading({ title, description }: { title: string; description: string }): JSX.Element {
  return (
    <div className="grid gap-1.5">
      <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      <p className="m-0 text-sm text-slate-500">{description}</p>
    </div>
  );
}

/** Dark brand panel shown beside the form on wide screens. */
function BrandPanel(): JSX.Element {
  return (
    <aside className="hidden select-none flex-col justify-between bg-slate-900 p-10 text-white lg:flex xl:p-14">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1.5">
          <img alt="Pristine Logo" className="h-full w-full object-contain" src={logoImg} />
        </span>
        <span className="text-base font-semibold tracking-tight">Pristine</span>
      </div>

      <div className="grid max-w-md gap-8">
        <div className="grid gap-3">
          <h2 className="m-0 text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Plan, prioritise and ship with your whole team.
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-slate-400">
            One workspace for your projects and for the people who use your product.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0">
          {VALUE_POINTS.map((point) => (
            <li className="flex items-start gap-3 text-sm text-slate-300" key={point}>
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={16} />
              {point}
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span>Apollo · Onboarding</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> On track
            </span>
          </div>
          {[
            { title: 'Ship SSO for enterprise workspaces', tone: 'bg-red-400/15 text-red-300', label: 'Critical' },
            { title: 'Welcome tour for new admins', tone: 'bg-amber-400/15 text-amber-300', label: 'High' },
            { title: 'Weekly digest email', tone: 'bg-slate-400/15 text-slate-300', label: 'Medium' }
          ].map((row) => (
            <div className="flex items-center justify-between gap-3 border-t border-white/5 py-2.5 text-sm" key={row.title}>
              <span className="truncate text-slate-200">{row.title}</span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', row.tone)}>{row.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="m-0 text-xs text-slate-500">© {new Date().getFullYear()} Pristine</p>
    </aside>
  );
}

/** Split layout on desktop, a single centred card on tablets and phones. */
function AuthShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <main className="min-h-screen bg-slate-50 font-sans lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:bg-white">
      <BrandPanel />
      <section className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 lg:py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
              <img alt="Pristine Logo" className="h-full w-full object-contain" src={logoImg} />
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">Pristine</span>
          </div>
          <div className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const { register, loading, error, user } = useAuth();
  const [email, setEmail] = useState<string>(emailParam);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const apiBase = useMemo(
    () => (api.defaults.baseURL ?? API_BASE_URL).replace(/\/$/, ''),
    []
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await register({ email, password, firstName, lastName });
      if (tokenParam) {
        navigate(`/accept-invitation?token=${tokenParam}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      // Handled by AuthContext
    }
  };

  const startGoogleSignIn = (): void => {
    const params = new URLSearchParams();
    params.set('redirect', '/dashboard');
    window.location.assign(`${apiBase}/auth/google?${params.toString()}`);
  };

  return (
    <AuthShell>
      <FormHeading description="Get started with Pristine in under a minute." title="Create your account" />

      <div className="grid gap-4">
        <button className={secondaryBtn} disabled={loading} onClick={startGoogleSignIn} type="button">
          <GoogleLogo />
          Sign up with Google
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </div>

      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            <span>First name</span>
            <input
              autoComplete="given-name"
              className={inputCls}
              name="firstName"
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="John"
              required
              type="text"
              value={firstName}
            />
          </label>
          <label className={labelCls}>
            <span>Last name</span>
            <input
              autoComplete="family-name"
              className={inputCls}
              name="lastName"
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Doe"
              required
              type="text"
              value={lastName}
            />
          </label>
        </div>

        <label className={labelCls}>
          <span>Email</span>
          <input
            autoComplete="email"
            className={cn(inputCls, emailParam && 'cursor-not-allowed bg-slate-50 text-slate-600')}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            readOnly={!!emailParam}
            required
            type="email"
            value={email}
          />
          {emailParam ? <span className="text-xs font-normal text-slate-500">This is the address your invitation was sent to.</span> : null}
        </label>

        <label className={labelCls}>
          <span>Password</span>
          <div className="relative">
            <input
              autoComplete="new-password"
              className={cn(inputCls, 'pr-10')}
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
            <button
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className={toggleBtn}
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {user != null ? (
          <p className="m-0 text-center text-xs text-slate-500">You already have an active session. Redirecting...</p>
        ) : null}

        {error ? <FormError>{error}</FormError> : null}

        <button className={cn(primaryBtn, 'mt-1')} disabled={loading} type="submit">
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="m-0 border-t border-slate-100 pt-5 text-center text-sm text-slate-500 lg:border-0 lg:pt-0">
        Already registered?{' '}
        <Link
          className="font-medium text-slate-900 hover:underline"
          to={tokenParam ? `/login?token=${tokenParam}&email=${encodeURIComponent(emailParam)}` : '/login'}
        >
          Login
        </Link>
      </p>
    </AuthShell>
  );
}

export default RegisterPage;