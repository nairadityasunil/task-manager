import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AlertCircle, Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import logoImg from '@/assets/logo.png';
import { buttonClass } from '@/components/ui';

function GoogleOAuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticateWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const redirectTo = params.get('redirect') ?? '/';

    if (!token) {
      setError('Google OAuth did not return a valid token.');
      return;
    }

    const timeout = setTimeout(() => {
      setError('Sign-in timed out. Please try again.');
    }, 10000);

    void (async () => {
      try {
        await authenticateWithToken(token);
        clearTimeout(timeout);
        navigate(redirectTo.startsWith('/') ? redirectTo : '/', { replace: true });
      } catch {
        clearTimeout(timeout);
        setError('Unable to complete Google sign-in.');
      }
    })();

    return () => clearTimeout(timeout);
  }, [authenticateWithToken, location.search, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 font-sans sm:px-6">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
          <img alt="Pristine Logo" className="h-full w-full object-contain" src={logoImg} />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900">Pristine</span>
      </div>
      <div className="flex w-full max-w-[400px] flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        {error ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle size={18} />
            </span>
            <h1 className="m-0 text-[15px] font-semibold text-slate-900">Google sign-in failed</h1>
            <p className="m-0 text-sm text-slate-500" role="alert">
              {error}
            </p>
            <Link className={buttonClass('secondary', 'md', 'mt-2')} to="/login">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-slate-400" size={22} />
            <p className="m-0 text-sm text-slate-600">Finalizing Google sign-in…</p>
          </>
        )}
      </div>
    </main>
  );
}

export default GoogleOAuthCallbackPage;