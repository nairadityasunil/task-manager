import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ShieldHalf } from 'lucide-react';

import { Button, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import api from '@/services/api';
import { agentName, agentsApi, timeAgo, type AgentApproval } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { ActionRiskBadge } from './shared';

/** Pending agent approvals for the signed-in person, refreshed every `pollMs`, with approve/reject. */
export function usePendingApprovals(pollMs = 0): {
  approvals: AgentApproval[] | null;
  busy: string | null;
  decide: (approval: AgentApproval, approve: boolean) => Promise<void>;
  reload: () => void;
} {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState<AgentApproval[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    // Background refresh: no global loader and no error toast.
    api
      .get('/agents/approvals', { params: { status: 'pending' }, silent: true })
      .then((response) => setApprovals(((response.data as { data?: AgentApproval[] })?.data ?? []) as AgentApproval[]))
      .catch(() => setApprovals((current) => current ?? []));
  }, []);

  useEffect(() => {
    reload();
    if (!pollMs) return;
    const id = window.setInterval(reload, pollMs);
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    window.addEventListener('pristine:approvals-changed', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pristine:approvals-changed', onFocus);
    };
  }, [pollMs, reload]);

  const decide = useCallback(
    async (approval: AgentApproval, approve: boolean) => {
      setBusy(approval.id);
      try {
        if (approve) await agentsApi.approve(approval.id);
        else await agentsApi.reject(approval.id);
        showToast({ variant: 'success', message: approve ? `Approved: ${approval.action}` : `Rejected: ${approval.action}` });
        setApprovals((current) => current?.filter((item) => item.id !== approval.id) ?? current);
        // Other lists (bell, Home, Governance) refresh too.
        window.dispatchEvent(new Event('pristine:approvals-changed'));
      } catch (error) {
        showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      } finally {
        setBusy(null);
      }
    },
    [showToast]
  );

  return { approvals, busy, decide, reload };
}

/** One "agent wants to …" request: what it asked for, its masked inputs, and the decision buttons. */
export function ApprovalRequestItem({
  approval,
  busy,
  onDecide,
  className
}: {
  approval: AgentApproval;
  busy: boolean;
  onDecide: (approve: boolean) => void;
  className?: string;
}): JSX.Element {
  const [showInputs, setShowInputs] = useState(false);
  const inputs = Object.entries(approval.inputPreview ?? {});
  return (
    <div className={cn('flex gap-2.5', className)} data-testid="approval-request">
      <span aria-hidden className="mt-0.5 inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-orange-50 text-orange-700">
        <ShieldHalf size={12} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-slate-900">
          <span className="font-medium">{agentName(approval.agentId)}</span> wants to run <code className="font-mono text-[12px]">{approval.action}</code>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <ActionRiskBadge risk={approval.risk} />
          <span>{timeAgo(approval.createdAt)}</span>
          {approval.policyName ? <span>· held by “{approval.policyName}”</span> : null}
        </div>
        {inputs.length || approval.request ? (
          <div className="mt-1.5">
            <button
              aria-expanded={showInputs}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              onClick={() => setShowInputs((value) => !value)}
              type="button"
            >
              <ChevronRight className={cn('transition-transform', showInputs && 'rotate-90')} size={12} />
              {showInputs ? 'Hide' : 'Show'} what it sent{inputs.length ? ` (${inputs.length})` : ''}
            </button>
            {showInputs ? (
              <dl className="m-0 mt-1.5 grid max-h-40 gap-1 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[12px]" data-testid="approval-inputs">
                {approval.request ? (
                  <div className="grid grid-cols-[minmax(0,90px)_minmax(0,1fr)] gap-2">
                    <dt className="truncate font-mono text-slate-500">request</dt>
                    <dd className="m-0 break-words font-mono text-slate-800">
                      {approval.request.method} {approval.request.path}
                    </dd>
                  </div>
                ) : null}
                {inputs.map(([key, value]) => (
                  <div className="grid grid-cols-[minmax(0,90px)_minmax(0,1fr)] gap-2" key={key}>
                    <dt className="truncate font-mono text-slate-500">{key}</dt>
                    <dd className="m-0 break-words font-mono text-slate-800">{typeof value === 'string' ? value : JSON.stringify(value)}</dd>
                  </div>
                ))}
                <p className="col-span-2 m-0 text-[11px] text-slate-500">Personal data and secrets are masked.</p>
              </dl>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 flex gap-2">
          <Button disabled={busy} onClick={() => onDecide(false)} size="sm" variant="secondary">
            Reject
          </Button>
          <Button loading={busy} onClick={() => onDecide(true)} size="sm" variant="dark">
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
