import { useEffect, useState } from 'react';
import { Check, Minus, Scissors } from 'lucide-react';

import { Badge, Button, cn } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentsApi, SCOPE_LABELS, type AgentDetail, type AgentReach } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const plural = (n: number, word: string): string => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/** What an agent can reach against what it has used, with one click to trim the rest. */
export function ReachPanel({ agent, onChanged }: { agent: AgentDetail; onChanged: () => void }): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [reach, setReach] = useState<AgentReach | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setReach(null);
    agentsApi
      .reach(agent.id)
      .then((next) => live && setReach(next))
      .catch((error) => live && showToast({ variant: 'error', message: toDisplayErrorMessage(error) }));
    return () => {
      live = false;
    };
  }, [agent.id, agent.scopes, agent.projectIds, showToast]);

  if (!reach) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;

  const removable = reach.scopes.filter((s) => s.removable);
  const suggestion = reach.suggestion;
  const narrowsProjects = suggestion && (reach.projects.all ? suggestion.projectIds.length > 0 : suggestion.projectIds.length < reach.projects.granted.length);

  const trim = async () => {
    if (!suggestion) return;
    const parts = [
      removable.length ? `remove ${removable.map((s) => SCOPE_LABELS[s.scope]?.label ?? s.scope).join(', ')}` : null,
      narrowsProjects ? `limit it to ${plural(suggestion.projectIds.length, 'project')} it changed` : null
    ].filter(Boolean);
    const ok = await confirm({
      title: 'Remove unused access?',
      message: `This will ${parts.join(' and ')}. Reads are not logged, so check it does not need to read other projects.`,
      confirmText: 'Remove access'
    });
    if (!ok) return;
    setBusy(true);
    try {
      await agentsApi.update(agent.id, suggestion);
      showToast({ variant: 'success', message: 'Unused access removed' });
      onChanged();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="reach-panel">
      <p className="m-0 text-xs text-slate-500">
        What it may do against what it did in the last {reach.windowDays} days. Changes and blocked attempts are logged; reads are not, so read
        access is never counted as unused.
      </p>

      {reach.tooNew ? (
        <p className="m-0 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">This agent is new: suggestions appear after two weeks of use.</p>
      ) : suggestion ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3" data-testid="reach-suggestion">
          <span className="text-[13px] text-emerald-900">
            {removable.length ? `${plural(removable.length, 'scope')} unused` : null}
            {removable.length && narrowsProjects ? ' · ' : null}
            {narrowsProjects ? `changes only ${plural(suggestion.projectIds.length, 'project')}` : null}
          </span>
          <Button icon={Scissors} loading={busy} onClick={() => void trim()} size="sm" variant="primary">
            Remove unused access
          </Button>
        </div>
      ) : (
        <p className="m-0 flex items-center gap-1.5 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
          <Check className="h-3.5 w-3.5 text-emerald-600" /> Its access matches what it uses.
        </p>
      )}

      <div>
        <h3 className="m-0 mb-1.5 text-[13px] font-medium text-slate-700">Scopes</h3>
        <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
          {reach.scopes.map((row) => (
            <li className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]" key={row.scope}>
              <span className="min-w-0">
                <span className="block font-medium text-slate-800">{SCOPE_LABELS[row.scope]?.label ?? row.scope}</span>
                <code className="font-mono text-[11px] text-slate-400">{row.scope}</code>
              </span>
              {!row.logged ? (
                <span className="text-xs text-slate-400">Reads not logged</span>
              ) : row.used ? (
                <span className="text-xs tabular-nums text-slate-600">{plural(row.used, 'call')}</span>
              ) : (
                <Badge tone={row.removable ? 'warning' : 'neutral'}>Unused</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="m-0 mb-1.5 text-[13px] font-medium text-slate-700">Projects</h3>
        <p className="m-0 mb-2 text-xs text-slate-500">
          {reach.projects.all
            ? `Can change every project its owner can${reach.projects.ownerProjectCount != null ? ` (${plural(reach.projects.ownerProjectCount, 'project')})` : ''}.`
            : `Limited to ${plural(reach.projects.granted.length, 'project')}.`}
        </p>
        <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
          {(reach.projects.all ? reach.projects.used : reach.projects.granted.map((p) => ({ id: p.id, name: p.name, calls: p.used }))).map((row) => (
            <li className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]" key={row.id ?? 'none'}>
              <span className="truncate text-slate-800">{row.name}</span>
              <span className={cn('flex items-center gap-1 text-xs tabular-nums', row.calls ? 'text-slate-600' : 'text-amber-700')}>
                {row.calls ? plural(row.calls, 'change') : (
                  <>
                    <Minus className="h-3 w-3" /> No changes
                  </>
                )}
              </span>
            </li>
          ))}
          {reach.projects.all && reach.projects.used.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">No changes in this period.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
