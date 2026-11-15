import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { SESSION_BLOCKED_EVENT } from '@/services/api';

/**
 * Shown when Agent Governance has suspended or revoked the tool this session runs in (an automated browser or
 * script using a person's login). Every request is refused in that state, so pages would otherwise look empty
 * and forms would seem to do nothing.
 */
export function SessionBlockedNotice(): JSX.Element | null {
  const { logout, token } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onBlocked = (event: Event) =>
      setMessage(
        String((event as CustomEvent<string>).detail || 'This session has been suspended.'),
      );
    window.addEventListener(SESSION_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(SESSION_BLOCKED_EVENT, onBlocked);
  }, []);

  // Signed out, or signed in again from somewhere that is not blocked.
  useEffect(() => {
    if (!token) setMessage(null);
  }, [token]);

  if (!message || !token) return null;
  return (
    <div
      aria-labelledby="blocked-title"
      aria-modal="true"
      className="fixed inset-0 z-[9000] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      data-testid="session-blocked"
      role="alertdialog"
    >
      <div className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
            <ShieldAlert size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-semibold text-slate-900" id="blocked-title">
              This session has been stopped by Agent Governance
            </h2>
            <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-slate-700">{message}</p>
            <p className="m-0 mt-2 text-[13px] leading-relaxed text-slate-600">
              Nothing loads or saves from this browser until that changes, which is why pages look
              empty and forms do not finish. A person can fix it by signing in from a normal
              browser, opening Agent Governance and choosing{' '}
              <span className="font-medium text-slate-800">Resume</span> or{' '}
              <span className="font-medium text-slate-800">Give it its own key</span> for this tool.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button onClick={() => window.location.reload()} variant="secondary">
            Try again
          </Button>
          <Button onClick={logout} variant="primary">
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
