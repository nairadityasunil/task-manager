import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { buttonClass } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

/** Unknown addresses: say so instead of silently sending people somewhere else. */
export default function NotFoundPage(): JSX.Element {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm" data-testid="not-found">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
          <Compass className="h-6 w-6 text-emerald-600" />
        </div>
        <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900">Page not found</h1>
        <p className="m-0 mt-2 break-all text-sm text-slate-500">
          There is nothing at <code className="font-mono text-slate-700">{pathname}</code>. The link may be out of date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link className={buttonClass('primary')} to={user ? '/dashboard' : '/'}>
            {user ? 'Go to dashboard' : 'Go to home page'}
          </Link>
          <Link className={buttonClass('secondary')} to="/guide">
            Product guide
          </Link>
        </div>
      </div>
    </main>
  );
}
