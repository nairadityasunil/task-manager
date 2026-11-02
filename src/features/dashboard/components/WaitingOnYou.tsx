import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldHalf } from 'lucide-react';

import { Button } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { agentName, agentsApi, timeAgo, type AgentApproval } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

/** Agent actions held for your decision, decided right here. */
export function WaitingOnYou(): JSX.Element {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState<AgentApproval[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    agentsApi
      .approvals('pending')
      .then(setApprovals)
      .catch(() => setApprovals([]));
  }, []);

  useEffect(load, [load]);

  const decide = async (approval: AgentApproval, approve: boolean) => {
    setBusy(approval.id);
    try {
      if (approve) await agentsApi.approve(approval.id);
      else await agentsApi.reject(approval.id);
      showToast({ variant: 'success', message: approve ? `Approved: ${approval.action}` : `Rejected: ${approval.action}` });
      load();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="waiting-title" data-testid="waiting-on-you">
      <h2 className="m-0 mb-2 text-sm font-semibold text-slate-900" id="waiting-title">
        Waiting on you
      </h2>
      <div className="rounded-[10px] border border-slate-200 bg-white">
        {approvals == null ? (
          <div className="h-16 animate-pulse rounded-[10px] bg-slate-50" />
        ) : approvals.length === 0 ? (
          <p className="m-0 px-4 py-4 text-[13px] text-slate-600">Nothing is waiting on you.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {approvals.slice(0, 4).map((approval) => (
              <li className="flex gap-2.5 border-b border-slate-100 px-3.5 py-3 last:border-b-0" key={approval.id}>
                <span aria-hidden className="mt-0.5 inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-orange-50 text-orange-700">
                  <ShieldHalf size={12} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-slate-900">
                    <span className="font-medium">{agentName(approval.agentId)}</span> wants to run{' '}
                    <code className="font-mono text-[12px]">{approval.action}</code>
                  </div>
                  <div className="text-xs text-slate-500">{timeAgo(approval.createdAt)}</div>
                  <div className="mt-2 flex gap-2">
                    <Button disabled={busy === approval.id} onClick={() => void decide(approval, false)} size="sm" variant="secondary">
                      Reject
                    </Button>
                    <Button loading={busy === approval.id} onClick={() => void decide(approval, true)} size="sm" variant="dark">
                      Approve
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {approvals && approvals.length > 4 ? (
          <Link className="block border-t border-slate-100 px-4 py-2.5 text-[13px] text-brand-600 hover:text-brand-700" to="/agents/approvals">
            See all {approvals.length}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
