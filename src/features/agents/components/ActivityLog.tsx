import { useEffect, useState } from 'react';
import { Download, History, Undo2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Button, Card, CardHeader, selectClass } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentName, agentsApi, timeAgo, type ActivityOutcome, type AgentActivity } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { ActionRiskBadge, OutcomeBadge } from './shared';

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function ActivityLog({ workspaceId, canAdmin }: { workspaceId: string | null; canAdmin: boolean }): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [outcome, setOutcome] = useState<ActivityOutcome | ''>('');
  const [rows, setRows] = useState<AgentActivity[] | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = async (before?: string) => {
    try {
      const page = await agentsApi.activity({ workspaceId: canAdmin ? workspaceId : null, outcome: outcome || undefined, before, limit: 50 });
      setRows((current) => (before ? [...(current ?? []), ...page] : page));
      setHasMore(page.length === 50);
    } catch (error) {
      setRows([]);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  useEffect(() => {
    setRows(null);
    void load();
  }, [outcome, workspaceId]);

  const undo = async (row: AgentActivity) => {
    const ok = await confirm({
      title: 'Undo this change?',
      message: row.undo?.entityType
        ? `The ${row.undo.entityType} goes back to how it was before ${agentName(row.agentId)} changed it. Later edits to it are lost.`
        : 'Restore the previous version?',
      confirmText: 'Undo'
    });
    if (!ok) return;
    try {
      await agentsApi.undo(row.id);
      showToast({ variant: 'success', message: 'Change undone' });
      await load();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  const exportAs = async (format: 'csv' | 'json') => {
    try {
      const blob = await agentsApi.exportActivity(format, workspaceId);
      download(blob, `agent-activity-${new Date().toISOString().slice(0, 10)}.${format}`);
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  return (
    <Card>
      <CardHeader
        actions={
          <>
            <select aria-label="Outcome" className={`${selectClass} h-8 sm:w-44`} onChange={(e) => setOutcome(e.target.value as ActivityOutcome | '')} value={outcome}>
              <option value="">All outcomes</option>
              <option value="allowed">Allowed</option>
              <option value="blocked">Blocked</option>
              <option value="pending_approval">Held for approval</option>
              <option value="error">Failed</option>
            </select>
            {canAdmin ? (
              <>
                <Button icon={Download} onClick={() => void exportAs('csv')} size="sm">
                  CSV
                </Button>
                <Button icon={Download} onClick={() => void exportAs('json')} size="sm">
                  JSON
                </Button>
              </>
            ) : null}
          </>
        }
        description="Every agent action with its decision. Inputs are masked; kept for 90 days."
        icon={<History className="h-4 w-4 text-slate-400" />}
        title="Agent activity"
      />
      {rows == null ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4">
          <EmptyState compact description="Actions taken by API keys, MCP clients, ChatGPT and AI providers appear here." icon={History} title="No agent activity yet" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Agent</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Outcome</th>
                  <th className="px-3 py-2 font-medium">Policy</th>
                  <th className="px-4 py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr className="align-top hover:bg-slate-50/60" data-testid="activity-row" key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500" title={new Date(row.createdAt).toLocaleString()}>
                      {timeAgo(row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{agentName(row.agentId)}</td>
                    <td className="px-3 py-2.5">
                      <code className="font-mono text-slate-800">{row.action}</code>
                      <div className="text-xs text-slate-400">{row.channel.toUpperCase()}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <ActionRiskBadge risk={row.risk} />
                    </td>
                    <td className="px-3 py-2.5">
                      <OutcomeBadge outcome={row.outcome} />
                      {row.error ? <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{row.error}</div> : null}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      {row.policyName ?? '—'}
                      {row.advisoryPolicies.length ? <div className="text-slate-400">Advisory: {row.advisoryPolicies.join(', ')}</div> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.undoable ? (
                        <Button icon={Undo2} onClick={() => void undo(row)} size="sm" variant="ghost">
                          Undo
                        </Button>
                      ) : row.undoneAt ? (
                        <span className="text-xs text-slate-400">Undone</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore ? (
            <div className="border-t border-slate-100 p-3 text-center">
              <Button onClick={() => void load(rows[rows.length - 1]?.createdAt)} size="sm">
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
