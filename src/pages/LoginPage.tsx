import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Key, QrCode, Shield, Smartphone } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { QRScanner } from '@/features/settings/components/QRScanner';
import api from '@/services/api';
import logoImg from '@/assets/logo.png';
import GoogleLogo from '@/components/GoogleLogo';
import { buttonClass, cn, inputClass } from '@/components/ui';

/** 40px-tall controls for the auth forms. */
const inputCls = inputClass.replace('h-9', 'h-10');
const labelCls = 'grid gap-1.5 text-sm font-medium text-slate-700';
const primaryBtn = buttonClass('primary', 'md', 'w-full').replace('h-9', 'h-10');
const secondaryBtn = buttonClass('secondary', 'md', 'w-full').replace('h-9', 'h-10');
const backBtn = buttonClass('ghost', 'md', 'w-full');
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

function FormSuccess({ children }: { children: string }): JSX.Element {
  return (
    <p className="m-0 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
      <CheckCircle2 className="mt-0.5 shrink-0" size={14} />
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

const GOOGLE_ERROR_HINTS: Record<string, string> = {
  access_denied: 'You cancelled the Google sign-in.',
  'Authorization code missing': 'Google did not return an authorization code. Please try again.'
};

/** Turns the `?error=` value the Google callback sends back into a readable sentence. */
function describeGoogleError(raw: string): string {
  const hint = GOOGLE_ERROR_HINTS[raw];
  if (hint) return hint;
  if (/redirect_uri_mismatch/i.test(raw)) {
    return 'Google rejected the sign-in because the redirect URI is not authorised. An administrator needs to add it in Google Cloud Console.';
  }
  if (/invalid_grant/i.test(raw)) return 'The Google sign-in link expired. Please try again.';
  if (/invalid_client|unauthorized_client/i.test(raw)) {
    return 'Google sign-in is misconfigured on the server (client ID or secret). Please contact your administrator.';
  }
  return raw;
}

function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const {
    login,
    loginWithCompanionKey,
    loginWithCompanionQr,
    loading,
    error,
    user,
    require2fa,
    tempEmail2fa,
    verify2fa,
    clearError
  } = useAuth();

  const [loginMode, setLoginMode] = useState<'account' | 'companion'>('account');
  const [companionMethod, setCompanionMethod] = useState<'key' | 'qr'>('key');
  const [email, setEmail] = useState<string>(emailParam);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Companion key
  const [companionKey, setCompanionKey] = useState<string>('');

  // 2FA code
  const [verificationCode, setVerificationCode] = useState<string>('');

  // Forgot password flow
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'none' | 'request-otp' | 'reset-password'>('none');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetOtp, setResetOtp] = useState<string>('');
  const [resetPassword, setResetPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [googleError] = useState<string | null>(() => {
    const raw = searchParams.get('error');
    return raw ? describeGoogleError(raw) : null;
  });

  // Drop ?error= from the address bar so a refresh doesn't show it again.
  useEffect(() => {
    if (!searchParams.has('error')) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [searchParams]);

  const nextPath = tokenParam
    ? `/accept-invitation?token=${tokenParam}`
    : ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard');

  // Automatic companion device login when scanning URL with companion query parameters
  useEffect(() => {
    const sessionIdParam = searchParams.get('sessionId');
    const qrTokenParam = searchParams.get('token') || searchParams.get('qrToken');

    if (sessionIdParam && qrTokenParam) {
      setLoginMode('companion');
      setCompanionMethod('qr');

      const url = new URL(window.location.href);
      url.searchParams.delete('sessionId');
      url.searchParams.delete('token');
      url.searchParams.delete('qrToken');
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url.toString());

      const userAgent = navigator.userAgent;
      let type = 'mobile';
      if (/ipad|tablet/i.test(userAgent)) type = 'tablet';
      else if (/macintosh|windows|linux/i.test(userAgent) && !/mobile/i.test(userAgent)) type = 'desktop';

      loginWithCompanionQr({
        sessionId: sessionIdParam,
        token: qrTokenParam,
        device: { type, userAgent }
      })
        .then(() => {
          navigate(nextPath, { replace: true });
        })
        .catch((err) => {
          console.error('URL companion pairing failed:', err);
        });
    }
  }, [searchParams, loginWithCompanionQr, navigate, nextPath]);

  const apiBase = useMemo(
    () => (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, ''),
    []
  );

  const startGoogleSignIn = (): void => {
    const params = new URLSearchParams();
    params.set('redirect', nextPath);
    window.location.assign(`${apiBase}/auth/google?${params.toString()}`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await login(email, password, rememberMe);
      if (!require2fa) {
        navigate(nextPath, { replace: true });
      }
    } catch {
      // Handled by AuthContext
    }
  };

  const handleVerify2fa = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await verify2fa(tempEmail2fa || email, verificationCode, rememberMe);
      navigate(nextPath, { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleCompanionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    try {
      await loginWithCompanionKey(companionKey);
      navigate(nextPath, { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleQrScanSuccess = async (qrData: { sessionId: string; token: string }): Promise<void> => {
    try {
      const userAgent = navigator.userAgent;
      let type = 'mobile';
      if (/ipad|tablet/i.test(userAgent)) type = 'tablet';
      else if (/macintosh|windows|linux/i.test(userAgent) && !/mobile/i.test(userAgent)) type = 'desktop';

      await loginWithCompanionQr({
        sessionId: qrData.sessionId,
        token: qrData.token,
        device: { type, userAgent }
      });
      navigate(nextPath, { replace: true });
    } catch {
      // Handled by AuthContext
    }
  };

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setResetLoading(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      setForgotPasswordStep('reset-password');
      setResetSuccessMessage('A password reset code has been sent to your email.');
    } catch (err) {
      const errorObj = err as { message?: string };
      setResetErrorMessage(errorObj.message || 'Failed to send verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setResetLoading(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await api.post('/auth/verify-otp', { email: resetEmail, otp: resetOtp, password: resetPassword });
      setForgotPasswordStep('none');
      setResetSuccessMessage('Your password has been successfully reset. Please log in.');
      setEmail(resetEmail);
    } catch (err) {
      const errorObj = err as { message?: string };
      setResetErrorMessage(errorObj.message || 'Failed to reset password. Verify your code.');
    } finally {
      setResetLoading(false);
    }
  };

  const segmentBtn = (active: boolean): string =>
    cn(
      'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15',
      active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
    );

  return (
    <AuthShell>
      {require2fa ? (
        /* 2FA view */
        <form className="grid gap-5" onSubmit={(event) => void handleVerify2fa(event)}>
          <div className="grid gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <Shield size={18} />
            </span>
            <div className="grid gap-1.5">
              <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Two-factor authentication</h1>
              <p className="m-0 text-sm text-slate-500">
                We've sent a 6-digit verification code to{' '}
                <strong className="font-medium text-slate-800">{tempEmail2fa || email}</strong>.
              </p>
            </div>
          </div>

          <label className={labelCls}>
            <span>Verification code</span>
            <input
              autoComplete="one-time-code"
              className={cn(inputCls, 'text-center font-mono text-base tracking-[0.3em]')}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setVerificationCode(event.target.value)}
              placeholder="000000"
              required
              type="text"
              value={verificationCode}
            />
          </label>

          {error ? <FormError>{error}</FormError> : null}

          <button className={primaryBtn} disabled={loading} type="submit">
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>

          <button
            className={backBtn}
            onClick={() => {
              clearError();
              window.location.reload();
            }}
            type="button"
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
        </form>
      ) : forgotPasswordStep === 'request-otp' ? (
        /* Forgot password: request code */
        <form className="grid gap-5" onSubmit={(event) => void handleRequestOtp(event)}>
          <FormHeading description="Enter your account email and we'll send you a reset code." title="Reset your password" />

          <label className={labelCls}>
            <span>Email</span>
            <input
              autoComplete="email"
              className={inputCls}
              onChange={(event) => setResetEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={resetEmail}
            />
          </label>

          {resetErrorMessage ? <FormError>{resetErrorMessage}</FormError> : null}

          <button className={primaryBtn} disabled={resetLoading} type="submit">
            {resetLoading ? 'Sending code...' : 'Send reset code'}
          </button>

          <button
            className={backBtn}
            onClick={() => {
              setForgotPasswordStep('none');
              setResetErrorMessage(null);
            }}
            type="button"
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
        </form>
      ) : forgotPasswordStep === 'reset-password' ? (
        /* Forgot password: enter code and new password */
        <form className="grid gap-5" onSubmit={(event) => void handleResetPassword(event)}>
          <FormHeading description="Check your inbox for the code, then choose a new password." title="Enter your reset code" />

          {resetSuccessMessage ? <FormSuccess>{resetSuccessMessage}</FormSuccess> : null}

          <label className={labelCls}>
            <span>Reset code</span>
            <input
              autoComplete="one-time-code"
              className={cn(inputCls, 'font-mono')}
              inputMode="numeric"
              onChange={(event) => setResetOtp(event.target.value)}
              placeholder="6-digit code"
              required
              type="text"
              value={resetOtp}
            />
          </label>

          <label className={labelCls}>
            <span>New password</span>
            <div className="relative">
              <input
                autoComplete="new-password"
                className={cn(inputCls, 'pr-10')}
                minLength={8}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type={showResetPassword ? 'text' : 'password'}
                value={resetPassword}
              />
              <button
                aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                className={toggleBtn}
                onClick={() => setShowResetPassword(!showResetPassword)}
                type="button"
              >
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {resetErrorMessage ? <FormError>{resetErrorMessage}</FormError> : null}

          <button className={primaryBtn} disabled={resetLoading} type="submit">
            {resetLoading ? 'Resetting password...' : 'Reset password'}
          </button>

          <button
            className={backBtn}
            onClick={() => {
              setForgotPasswordStep('none');
              setResetErrorMessage(null);
              setResetSuccessMessage(null);
            }}
            type="button"
          >
            <ArrowLeft size={16} /> Cancel
          </button>
        </form>
      ) : (
        /* Main sign-in */
        <>
          <FormHeading description="Welcome back. Sign in to your Pristine workspace." title="Sign in" />

          {resetSuccessMessage ? <FormSuccess>{resetSuccessMessage}</FormSuccess> : null}

          {googleError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
              <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={16} />
              <div className="min-w-0">
                <p className="m-0 font-medium">Google sign-in couldn't be completed</p>
                <p className="m-0 mt-0.5 text-[13px] text-red-700">{googleError}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            <button className={secondaryBtn} disabled={loading} onClick={startGoogleSignIn} type="button">
              <GoogleLogo />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Mode switch */}
            <div aria-label="Login method" className="flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist">
              {(
                [
                  { key: 'account', label: 'Account', Icon: Shield },
                  { key: 'companion', label: 'Companion', Icon: Smartphone }
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  aria-selected={loginMode === key}
                  className={segmentBtn(loginMode === key)}
                  key={key}
                  onClick={() => {
                    setLoginMode(key);
                    clearError();
                  }}
                  type="button"
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {loginMode === 'account' ? (
            <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
              <label className={labelCls}>
                <span>Email</span>
                <input
                  autoComplete="email"
                  className={inputCls}
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
                    Password
                  </label>
                  <button
                    className="rounded text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
                    onClick={() => {
                      setForgotPasswordStep('request-otp');
                      setResetEmail(email);
                      clearError();
                    }}
                    type="button"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className={cn(inputCls, 'pr-10')}
                    id="login-password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
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
              </div>

              <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
                <input
                  checked={rememberMe}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                Remember me
              </label>

              {user != null ? (
                <p className="m-0 text-center text-xs text-slate-500">You already have an active session. Redirecting...</p>
              ) : null}

              {error ? <FormError>{error}</FormError> : null}

              <button className={cn(primaryBtn, 'mt-1')} disabled={loading} type="submit">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
                <button className={segmentBtn(companionMethod === 'key')} onClick={() => setCompanionMethod('key')} type="button">
                  <Key size={14} /> Pairing key
                </button>
                <button className={segmentBtn(companionMethod === 'qr')} onClick={() => setCompanionMethod('qr')} type="button">
                  <QrCode size={14} /> Scan QR
                </button>
              </div>

              {companionMethod === 'key' ? (
                <form className="grid gap-4" onSubmit={(event) => void handleCompanionSubmit(event)}>
                  <label className={labelCls}>
                    <span>Pairing key</span>
                    <input
                      className={cn(inputCls, 'font-mono')}
                      name="companion-key"
                      onChange={(event) => setCompanionKey(event.target.value)}
                      placeholder="cmp_..."
                      required
                      type="password"
                      value={companionKey}
                    />
                    <span className="text-xs font-normal text-slate-500">
                      Generate a one-time key on your primary device under Settings → Companion devices.
                    </span>
                  </label>
                  {error ? <FormError>{error}</FormError> : null}
                  <button className={primaryBtn} disabled={loading || !companionKey.trim()} type="submit">
                    {loading ? 'Connecting...' : 'Connect companion device'}
                  </button>
                </form>
              ) : (
                <div className="grid gap-3">
                  <QRScanner
                    isLoading={loading}
                    onFallbackToKey={() => setCompanionMethod('key')}
                    onScanSuccess={(qrData) => void handleQrScanSuccess(qrData)}
                  />
                  {error ? <FormError>{error}</FormError> : null}
                </div>
              )}
            </div>
          )}

          <p className="m-0 border-t border-slate-100 pt-5 text-center text-sm text-slate-500 lg:border-0 lg:pt-0">
            New to Pristine?{' '}
            <Link
              className="font-medium text-slate-900 hover:underline"
              to={tokenParam ? `/register?token=${tokenParam}&email=${encodeURIComponent(emailParam)}` : '/register'}
            >
              Create an account
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

export default LoginPage;