import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import Loader from '@/components/Loader';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toDisplayErrorMessage } from '@/utils/apiError';

/**
 * Sign-in for the platform admin console. It is separate from the everyday sign-in: only platform admins get in,
 * and a normal account is told it is not one.
 */
export function AdminLoginPage(): JSX.Element {
  const { user, loading, adminLogin, adminVerify2fa, require2fa, tempEmail2fa, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && user == null && !busy) return <Loader center />;
  if (user?.isSuperAdmin) return <Navigate replace to="/admin" />;

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (require2fa && tempEmail2fa) await adminVerify2fa(tempEmail2fa, code.trim());
      else await adminLogin(email.trim(), password);
    } catch (e) {
      setError(typeof e === 'string' ? e : toDisplayErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10" data-testid="admin-login">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
          <ShieldCheck size={18} />
        </span>
        <div className="leading-tight">
          <div className="text-base font-semibold tracking-tight text-slate-900">Pristine</div>
          <div className="text-xs font-medium text-slate-500">Platform admin</div>
        </div>
      </div>
      <form className="grid w-full max-w-[400px] gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={(e) => void submit(e)}>
        <h1 className="m-0 text-[17px] font-semibold text-slate-900">{require2fa ? 'Enter your code' : 'Sign in to the admin console'}</h1>
        {user && !user.isSuperAdmin ? (
          <p className="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900" data-testid="admin-login-not-admin" role="status">
            You are signed in as {user.email}, which is not a platform admin.{' '}
            <button className="font-medium underline" onClick={logout} type="button">
              Sign out
            </button>{' '}
            to use another account.
          </p>
        ) : null}
        {require2fa ? (
          <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
            Verification code
            <Input autoComplete="one-time-code" autoFocus data-testid="admin-login-code" inputMode="numeric" onChange={(e) => setCode(e.target.value)} value={code} />
            <span className="text-xs font-normal text-slate-500">We sent a code to {tempEmail2fa}.</span>
          </label>
        ) : (
          <>
            <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
              Email
              <Input autoComplete="username" autoFocus data-testid="admin-login-email" onChange={(e) => setEmail(e.target.value)} type="email" value={email} />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
              Password
              <Input autoComplete="current-password" data-testid="admin-login-password" onChange={(e) => setPassword(e.target.value)} type="password" value={password} />
            </label>
          </>
        )}
        {error ? (
          <p className="m-0 text-[13px] text-red-700" data-testid="admin-login-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button data-testid="admin-login-submit" disabled={busy || (require2fa ? !code.trim() : !email.trim() || !password)} loading={busy} type="submit">
          {require2fa ? 'Verify' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
