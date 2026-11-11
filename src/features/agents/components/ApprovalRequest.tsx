import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ShieldHalf, ThumbsDown, ThumbsUp } from 'lucide-react';

import { Button, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import api from '@/services/api';
import { agentName, agentsApi, timeAgo, type AgentApproval } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { ActionRiskBadge } from './shared';

export type ApprovalDecision = 'approve' | 'reject' | 'scope_down';

/** Pending agent approvals for the signed-in person, refreshed every `pollMs`, with approve, reject and scope down. */
export function usePendingApprovals(pollMs = 0): {
  approvals: AgentApproval[] | null;
  busy: string | null;
  decide: (approval: AgentApproval, decision: ApprovalDecision) => Promise<void>;
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
    async (approval: AgentApproval, decision: ApprovalDecision) => {
      setBusy(approval.id);
      try {
        if (decision === 'approve') await agentsApi.approve(approval.id);
        else if (decision === 'reject') await agentsApi.reject(approval.id);
        else {
          const result = await agentsApi.scopeDown(approval.id);
          showToast({ variant: 'success', message: `Rejected, and ${agentName(approval.agentId)} lost the "${result.removedScope}" scope` });
        }
        if (decision !== 'scope_down') {
          showToast({ variant: 'success', message: decision === 'approve' ? `Approved: ${approval.action}` : `Rejected: ${approval.action}` });
        }
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

const TIER_TONE: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-50 text-amber-800',
  high: 'bg-orange-50 text-orange-800',
  critical: 'bg-red-50 text-red-700'
};

/** The system's recommendation for a held action, its reasons, the risk tier and any DLP findings. */
export function ApprovalInsight({ approval, className }: { approval: AgentApproval; className?: string }): JSX.Element | null {
  const rec = approval.recommendation;
  if (!rec && !approval.tier && !(approval.dlp ?? []).length) return null;
  return (
    <div className={cn('rounded-md border border-slate-200 bg-slate-50/70 p-2 text-xs', className)} data-testid="approval-insight">
      <div className="flex flex-wrap items-center gap-1.5">
        {rec ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium',
              rec.decision === 'approve' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
            )}
            data-testid="approval-recommendation"
          >
            {rec.decision === 'approve' ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
            Recommended: {rec.decision}
          </span>
        ) : null}
        {approval.tier ? <span className={cn('rounded px-1.5 py-0.5 font-medium', TIER_TONE[approval.tier])}>{approval.tier} risk</span> : null}
        {(approval.dlp ?? []).map((finding) => (
          <span className="rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-800" key={finding.type}>
            DLP: {finding.label.toLowerCase()}
          </span>
        ))}
      </div>
      {rec?.reasons.length ? (
        <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
          {rec.reasons.slice(0, 4).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** One "agent wants to …" request: what it asked for, the system's recommendation, its masked inputs, and the decision buttons. */
export function ApprovalRequestItem({
  approval,
  busy,
  onDecide,
  className
}: {
  approval: AgentApproval;
  busy: boolean;
  onDecide: (decision: ApprovalDecision) => void;
  className?: string;
}): JSX.Element {
  const [showInputs, setShowInputs] = useState(false);
  const inputs = Object.entries(approval.inputPreview ?? {});
  const recommended = approval.recommendation?.decision;
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
        <ApprovalInsight approval={approval} className="mt-1.5" />
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
        <div className="mt-2 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => onDecide('reject')} size="sm" variant={recommended === 'reject' ? 'dark' : 'secondary'}>
            Reject
          </Button>
          <Button loading={busy} onClick={() => onDecide('approve')} size="sm" variant={recommended === 'reject' ? 'secondary' : 'dark'}>
            Approve
          </Button>
          <Button
            disabled={busy}
            onClick={() => onDecide('scope_down')}
            size="sm"
            title="Reject, and remove the permission this action needs from the agent"
            variant="ghost"
          >
            Scope down
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface SecurityItem {
  id: string;
  kind: 'incident' | 'alert';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  at: string;
  link: string;
}

const SECURITY_ALERT_TYPES = new Set(['unregistered_agent', 'threat', 'dlp', 'compliance_drift', 'critical_risk']);

/** Open incidents and unacknowledged shadow AI, threat, DLP and drift alerts, for the main inbox. */
export function useSecurityInbox(pollMs = 60_000): SecurityItem[] {
  const [items, setItems] = useState<SecurityItem[]>([]);
  useEffect(() => {
    const load = () => {
      Promise.all([
        api.get('/agents/incidents', { params: { status: 'open' }, silent: true }).then((r) => (r.data as { data?: Array<{ id: string; title: string; severity: 'warning' | 'critical'; summary: string; createdAt: string }> }).data ?? []).catch(() => []),
        api.get('/agents/alerts', { params: { open: '1' }, silent: true }).then((r) => (r.data as { data?: Array<{ id?: string; _id?: string; type: string; severity: 'info' | 'warning' | 'critical'; title: string; detail: string; createdAt: string }> }).data ?? []).catch(() => [])
      ]).then(([incidents, alerts]) => {
        const week = Date.now() - 7 * 86_400_000;
        setItems([
          ...incidents.map((i) => ({ id: `incident:${i.id}`, kind: 'incident' as const, severity: i.severity, title: `Incident: ${i.title}`, detail: i.summary, at: i.createdAt, link: `/agents/incidents?incident=${i.id}` })),
          ...alerts
            .filter((a) => SECURITY_ALERT_TYPES.has(a.type) && new Date(a.createdAt).getTime() >= week)
            .slice(0, 8)
            .map((a) => ({ id: `alert:${a.id ?? a._id}`, kind: 'alert' as const, severity: a.severity, title: a.title, detail: a.detail, at: a.createdAt, link: a.type === 'compliance_drift' ? '/agents/compliance' : '/agents' }))
        ]);
      });
    };
    load();
    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);
  return items;
}
