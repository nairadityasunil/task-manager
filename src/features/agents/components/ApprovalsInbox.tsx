import { useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Button, Card, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { agentName, agentsApi, timeAgo, userLabel, type AgentApproval, type ApprovalStatus } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { ActionRiskBadge, ApprovalBadge } from './shared';

const FILTERS: Array<{ value: ApprovalStatus | 'all'; label: string }> = [
  { value: 'pending', label: 'Waiting' },
  { value: 'executed', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' }
];

export function ApprovalsInbox({ onChanged }: { onChanged?: () => void }): JSX.Element {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [items, setItems] = useState<AgentApproval[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await agentsApi.approvals(filter === 'all' ? undefined : filter));
    } catch (error) {
      setItems([]);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  useEffect(() => {
    setItems(null);
    void load();
  }, [filter]);

  const decide = async (approval: AgentApproval, decision: 'approve' | 'reject') => {
    setBusy(approval.id);
    try {
      const result =
        decision === 'approve'
          ? await agentsApi.approve(approval.id, notes[approval.id])
          : await agentsApi.reject(approval.id, notes[approval.id]);
      showToast({
        variant: result.status === 'failed' ? 'error' : 'success',
        message:
          result.status === 'executed'
            ? `Approved: ${approval.action} ran for ${agentName(approval.agentId)}`
            : result.status === 'failed'
              ? `Approved, but the action failed: ${result.error ?? 'unknown error'}`
              : 'Request rejected'
      });
      await load();
      onChanged?.();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((item) => (
          <button
            className={cn(
              'h-8 rounded-lg border px-3 text-[13px] font-medium',
              filter === item.value ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            )}
            key={item.value}
            onClick={() => setFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {items == null ? (
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
      ) : items.length === 0 ? (
        <EmptyState
          description={filter === 'pending' ? 'Agent actions held by an approval policy show up here.' : 'Nothing in this view.'}
          icon={Inbox}
          title={filter === 'pending' ? 'No requests waiting' : 'No requests'}
        />
      ) : (
        <div className="space-y-3">
          {items.map((approval) => {
            const pending = approval.status === 'pending' && new Date(approval.expiresAt).getTime() > Date.now();
            return (
              <Card className="p-4" data-testid="approval-card" key={approval.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-[13px] font-semibold text-slate-900">{approval.action}</code>
                      <ActionRiskBadge risk={approval.risk} />
                      <ApprovalBadge status={approval.status} />
                    </div>
                    <p className="m-0 text-xs text-slate-500">
                      {agentName(approval.agentId)} for {userLabel(approval.ownerUserId)} · {approval.channel.toUpperCase()}
                      {approval.request ? ` ${approval.request.method} ${approval.request.path.split('?')[0]}` : ''} · {timeAgo(approval.createdAt)}
                      {approval.policyName ? ` · policy "${approval.policyName}"` : ''}
                    </p>
                  </div>
                  {pending ? (
                    <span className="text-xs text-slate-500">Expires {new Date(approval.expiresAt).toLocaleString()}</span>
                  ) : approval.decidedBy ? (
                    <span className="text-xs text-slate-500">
                      {userLabel(approval.decidedBy)} · {timeAgo(approval.decidedAt)}
                    </span>
                  ) : null}
                </div>
                <pre className="m-0 mt-3 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2.5 font-mono text-xs text-slate-700">
                  {JSON.stringify(approval.inputPreview, null, 2)}
                </pre>
                {approval.error ? <p className="m-0 mt-2 text-xs text-red-600">{approval.error}</p> : null}
                {approval.note ? <p className="m-0 mt-2 text-xs text-slate-600">Note: {approval.note}</p> : null}
                {pending ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      aria-label="Note"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 text-[13px] focus:border-emerald-500 focus:outline-none"
                      onChange={(e) => setNotes((n) => ({ ...n, [approval.id]: e.target.value }))}
                      placeholder="Optional note"
                      value={notes[approval.id] ?? ''}
                    />
                    <Button disabled={busy === approval.id} icon={X} onClick={() => void decide(approval, 'reject')} size="sm" variant="danger">
                      Reject
                    </Button>
                    <Button icon={Check} loading={busy === approval.id} onClick={() => void decide(approval, 'approve')} size="sm" variant="primary">
                      Approve and run
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
