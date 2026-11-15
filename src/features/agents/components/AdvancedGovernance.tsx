import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Check, Clock, History, KeyRound, Play, Plus, RotateCcw, Square, Tag, Trash2, Workflow, X } from 'lucide-react';

import Modal from '@/components/Modal';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, Switch, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import {
  agentName,
  agentsApi,
  CLASSIFICATION_LABELS,
  EFFECT_LABELS,
  SCOPE_LABELS,
  timeAgo,
  userLabel,
  type Agent,
  type AgentBaseline,
  type AgentElevation,
  type AgentPolicy,
  type Classification,
  type Playbook,
  type PlaybookRun,
  type PlaybookStepType,
  type PlaybookTemplates,
  type PolicyChange,
  type PolicyVersion,
  type SimulationResult
} from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const useAction = () => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async (key: string, fn: () => Promise<unknown>, message?: string) => {
      setBusy(key);
      try {
        await fn();
        if (message) showToast({ variant: 'success', message });
        return true;
      } catch (error) {
        showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [showToast]
  );
  return { busy, run };
};

const minutesLeft = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
const scopeLabel = (scope: string) => SCOPE_LABELS[scope]?.label ?? scope;
const TIER_TONE = { low: 'neutral', medium: 'warning', high: 'orange' } as const;

/* ------------------------------------------------------------------ */
/* Just-in-time access                                                 */
/* ------------------------------------------------------------------ */

/** Agents asking for extra scopes for a while, and the grants that are running. */
export function AccessRequests({ agentId, onChanged, compact = false }: { agentId?: string; onChanged?: () => void; compact?: boolean }): JSX.Element | null {
  const { busy, run } = useAction();
  const [items, setItems] = useState<AgentElevation[] | null>(null);
  const [minutes, setMinutes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    agentsApi
      .elevations({ status: agentId ? 'pending,active,expired,revoked,rejected' : 'pending,active', agentId })
      .then(setItems)
      .catch(() => setItems([]));
  }, [agentId]);
  useEffect(load, [load]);

  const act = async (key: string, fn: () => Promise<unknown>, message: string) => {
    if (await run(key, fn, message)) {
      load();
      onChanged?.();
      window.dispatchEvent(new Event('pristine:approvals-changed'));
    }
  };

  if (items == null) return compact ? null : <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  const visible = agentId ? items.slice(0, 8) : items;
  if (!visible.length) {
    return compact ? (
      <p className="m-0 text-xs text-slate-500">No just-in-time access yet. The agent can ask with POST /api/agents/elevations.</p>
    ) : null;
  }

  return (
    <div className="space-y-2" data-testid="access-requests">
      {!agentId ? (
        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-900">
          <KeyRound size={14} className="text-slate-400" /> Access requests
          <span className="text-xs font-normal text-slate-500">Extra scopes for a limited time; they end on their own.</span>
        </div>
      ) : null}
      {visible.map((e) => {
        const pending = e.status === 'pending';
        const active = e.status === 'active' && new Date(e.expiresAt).getTime() > Date.now();
        return (
          <div className={cn('rounded-lg border border-slate-200 bg-white', compact ? 'p-2.5' : 'p-3')} data-status={e.status} data-testid="access-request" key={e.id}>
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              {!agentId ? <span className="font-medium text-slate-900">{agentName(e.agentId)}</span> : null}
              <span className="text-slate-600">{agentId ? '' : 'asks for '}</span>
              {e.scopes.map((scope) => (
                <Badge key={scope} tone="neutral">
                  {scopeLabel(scope)}
                </Badge>
              ))}
              <span className="text-slate-600">for {e.durationMinutes} min</span>
              <Badge tone={TIER_TONE[e.tier] ?? 'neutral'}>{e.tier} risk</Badge>
              {active ? <Badge tone="success">Active · {minutesLeft(e.expiresAt)} min left</Badge> : null}
              {!pending && !active ? <Badge tone="neutral">{e.status === 'active' ? 'ended' : e.status}</Badge> : null}
              {e.decidedBySystem ? <Badge tone="dark">System decided</Badge> : null}
            </div>
            <p className="m-0 mt-1 text-xs text-slate-600">
              “{e.reason}” · {timeAgo(e.createdAt)}
              {e.usedCount ? ` · used ${e.usedCount} time(s)` : ''}
              {e.decidedBy && !e.decidedBySystem ? ` · ${e.status === 'rejected' ? 'refused' : 'granted'} by ${userLabel(e.decidedBy)}` : ''}
            </p>
            {pending ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select
                  aria-label="Grant for"
                  className="w-36"
                  onValueChange={(value) => setMinutes((m) => ({ ...m, [e.id]: value }))}
                  options={[...new Set([15, 30, 60, e.durationMinutes])].sort((a, b) => a - b).map((m) => ({ value: String(m), label: `${m} minutes` }))}
                  value={minutes[e.id] ?? String(e.durationMinutes)}
                />
                <Button disabled={busy === e.id} icon={X} onClick={() => void act(e.id, () => agentsApi.rejectElevation(e.id), 'Request refused')} size="sm" variant="secondary">
                  Refuse
                </Button>
                <Button
                  icon={Check}
                  loading={busy === e.id}
                  onClick={() => void act(e.id, () => agentsApi.approveElevation(e.id, Number(minutes[e.id] ?? e.durationMinutes)), `Granted for ${minutes[e.id] ?? e.durationMinutes} minutes`)}
                  size="sm"
                  variant="primary"
                >
                  Grant
                </Button>
              </div>
            ) : active ? (
              <div className="mt-2">
                <Button icon={Square} loading={busy === e.id} onClick={() => void act(e.id, () => agentsApi.revokeElevation(e.id), 'Access ended')} size="sm" variant="secondary">
                  End now
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent drawer: baseline, key lifecycle                               */
/* ------------------------------------------------------------------ */

/** What normal looks like for this agent, and how the last hour compares. */
export function AgentBaselineCard({ agentId }: { agentId: string }): JSX.Element {
  const { busy, run } = useAction();
  const [data, setData] = useState<{ baseline: AgentBaseline | null; current: { changesLastHour: number; ratio: number | null } } | null>(null);
  useEffect(() => {
    agentsApi.baseline(agentId).then(setData).catch(() => setData({ baseline: null, current: { changesLastHour: 0, ratio: null } }));
  }, [agentId]);
  const b = data?.baseline;
  const ratio = data?.current.ratio ?? null;
  return (
    <div className="rounded-lg border border-slate-200 p-3" data-testid="agent-baseline">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900">
          <Activity size={14} className="text-slate-400" /> Normal behaviour
        </div>
        <Button loading={busy === 'b'} onClick={() => void run('b', () => agentsApi.baseline(agentId, true).then(setData))} size="sm" variant="ghost">
          Recompute
        </Button>
      </div>
      {!data ? (
        <div className="mt-2 h-10 animate-pulse rounded bg-slate-100" />
      ) : !b?.ready ? (
        <p className="m-0 mt-1 text-xs text-slate-500">
          Learning: a baseline needs 7 days of activity{b ? ` (${b.days} so far, ${b.sample} changes)` : ''}. Until then, deviations are not scored.
        </p>
      ) : (
        <>
          <dl className="m-0 mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-slate-500">Changes a day</dt>
              <dd className="m-0 font-mono text-[13px] text-slate-900">
                {b.dailyP50}–{b.dailyP95}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Usual hourly peak</dt>
              <dd className="m-0 font-mono text-[13px] text-slate-900">{b.hourlyP95}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last hour</dt>
              <dd className={cn('m-0 font-mono text-[13px]', ratio != null && ratio >= 4 ? 'font-semibold text-red-700' : 'text-slate-900')} data-testid="baseline-last-hour">
                {data.current.changesLastHour}
                {ratio != null && ratio >= 2 ? ` (${ratio}×)` : ''}
              </dd>
            </div>
          </dl>
          <p className="m-0 mt-2 text-xs text-slate-500">
            {b.actions.length} usual action(s), {b.projects.length} project(s), {Math.round(b.errorRate * 100)}% errors over {b.days} days. Changes 4× above the usual peak, new actions or new projects are held for a person.
          </p>
        </>
      )}
    </div>
  );
}

/** Key age, rotation with an overlap, and collecting a key the system rotated. */
export function KeyLifecycleCard({
  agent,
  isOwner,
  maxAgeDays,
  onRotated,
  onKey
}: {
  agent: Agent;
  isOwner: boolean;
  maxAgeDays?: number;
  onRotated: (agent: Agent) => void;
  onKey: (key: string) => void;
}): JSX.Element | null {
  const { busy, run } = useAction();
  const [grace, setGrace] = useState('24');
  if (agent.kind !== 'api_key' || agent.status === 'revoked') return null;
  const issued = agent.keyIssuedAt ?? agent.createdAt;
  const ageDays = Math.floor((Date.now() - new Date(issued).getTime()) / 86_400_000);
  const due = maxAgeDays ? ageDays >= maxAgeDays - 7 : false;
  return (
    <div className="rounded-lg border border-slate-200 p-3" data-testid="key-lifecycle">
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-900">
        <KeyRound size={14} className="text-slate-400" /> Key
        <span className={cn('text-xs font-normal', due ? 'text-amber-700' : 'text-slate-500')}>
          {ageDays} day(s) old{maxAgeDays ? ` of ${maxAgeDays} allowed` : ''}
        </span>
      </div>
      {agent.hasPendingKey ? (
        <div className="mt-2 rounded-md bg-brand-50 p-2.5 text-xs text-brand-800" data-testid="pending-key">
          The system rotated this key {timeAgo(agent.pendingKeyIssuedAt)}.{' '}
          {agent.previousKeyExpiresAt ? `The old key works until ${new Date(agent.previousKeyExpiresAt).toLocaleString()}.` : ''}
          {isOwner ? (
            <div className="mt-2">
              <Button
                icon={KeyRound}
                loading={busy === 'reveal'}
                onClick={() =>
                  void run('reveal', async () => {
                    const r = await agentsApi.revealPendingKey(agent.id);
                    onKey(r.key);
                    onRotated({ ...agent, hasPendingKey: false });
                  })
                }
                size="sm"
                variant="primary"
              >
                Collect new key (shown once)
              </Button>
            </div>
          ) : (
            <span> Only the owner can collect it.</span>
          )}
        </div>
      ) : agent.previousKeyExpiresAt && new Date(agent.previousKeyExpiresAt).getTime() > Date.now() ? (
        <p className="m-0 mt-1 text-xs text-slate-600">The previous key keeps working until {new Date(agent.previousKeyExpiresAt).toLocaleString()}.</p>
      ) : null}
      {isOwner && agent.status === 'active' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select
            aria-label="Old key keeps working for"
            className="w-44"
            onValueChange={setGrace}
            options={[
              { value: '0', label: 'Old key stops now' },
              { value: '24', label: 'Old key works 24 h' },
              { value: '48', label: 'Old key works 48 h' },
              { value: '168', label: 'Old key works 7 days' }
            ]}
            value={grace}
          />
          <Button
            icon={RotateCcw}
            loading={busy === 'rotate'}
            onClick={() =>
              void run('rotate', async () => {
                const r = await agentsApi.rotate(agent.id, Number(grace));
                onKey(r.key);
                onRotated(r.agent);
              })
            }
            size="sm"
            variant="secondary"
          >
            Rotate key
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data labels                                                         */
/* ------------------------------------------------------------------ */

export function ClassificationBadge({ value, className }: { value?: Classification | null; className?: string }): JSX.Element | null {
  if (!value || value === 'internal' || value === 'public') return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', CLASSIFICATION_LABELS[value].tone, className)} data-testid="classification-badge">
      <Tag size={10} /> {CLASSIFICATION_LABELS[value].label}
    </span>
  );
}

/** The project's data label in its header; opens the label setting for people who manage the project. */
export function ProjectLabelChip({ projectId, onEdit, className }: { projectId: string; onEdit?: () => void; className?: string }): JSX.Element | null {
  const [value, setValue] = useState<Classification | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    agentsApi
      .classification({ projectIds: [projectId] })
      .then((r) => !cancelled && setValue(r.projects[projectId] ?? 'internal'))
      .catch(() => !cancelled && setValue(null));
    return () => {
      cancelled = true;
    };
  }, [projectId]);
  if (!value) return null;
  const info = CLASSIFICATION_LABELS[value];
  const title = `Data label: ${info.label}. ${info.detail}${onEdit ? ' Click to change.' : ''}`;
  const body = (
    <>
      <Tag size={11} /> {info.label}
    </>
  );
  const cls = cn('inline-flex h-6 select-none items-center gap-1 rounded px-1.5 text-[11px] font-medium', info.tone, className);
  return onEdit ? (
    <button aria-label={title} className={cn(cls, 'hover:brightness-95')} data-testid="project-label-chip" onClick={onEdit} title={title} type="button">
      {body}
    </button>
  ) : (
    <span className={cls} data-testid="project-label-chip" title={title}>
      {body}
    </span>
  );
}

/** Label a project or a task for agent governance. Tasks can inherit their project's label. */
export function ClassificationSelect({
  projectId,
  taskId,
  className,
  inherit = false,
  compact = false
}: {
  projectId?: string | null;
  taskId?: string | null;
  className?: string;
  /** Hide the explanation next to the picker (narrow places). */
  compact?: boolean;
  /** A task: offer "Same as project". */
  inherit?: boolean;
}): JSX.Element | null {
  const { busy, run } = useAction();
  const [value, setValue] = useState<Classification | null | undefined>(undefined);
  useEffect(() => {
    if (!projectId && !taskId) return;
    agentsApi
      .classification(taskId ? { taskIds: [taskId] } : { projectIds: [projectId as string] })
      .then((r) => setValue(taskId ? (r.tasks[taskId] ?? null) : (r.projects[projectId as string] ?? null)))
      .catch(() => setValue(null));
  }, [projectId, taskId]);
  if (!projectId && !taskId) return null;
  const options = [
    ...(inherit ? [{ value: '', label: 'Same as project' }] : []),
    ...(['public', 'internal', 'confidential', 'restricted'] as Classification[]).map((c) => ({ value: c, label: CLASSIFICATION_LABELS[c].label }))
  ];
  const current = value === undefined ? (inherit ? '' : 'internal') : (value ?? (inherit ? '' : 'internal'));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        aria-label="Data label"
        className="w-44"
        disabled={busy === 'label' || value === undefined}
        onValueChange={(next) =>
          void run(
            'label',
            async () => {
              const r = await agentsApi.setClassification({ ...(taskId ? { taskId } : { projectId: projectId as string }), classification: (next || null) as Classification | null });
              setValue(r.classification);
            },
            next ? `Labelled ${CLASSIFICATION_LABELS[next as Classification].label}` : 'Uses the project label'
          )
        }
        options={options}
        value={current}
      />
      {current && !compact ? <span className="hidden text-xs text-slate-500 sm:inline">{CLASSIFICATION_LABELS[current as Classification]?.detail}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Policies: simulation, history, proposals                            */
/* ------------------------------------------------------------------ */

const showValue = (value: unknown): string => {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  effect: 'Effect',
  mode: 'Mode',
  priority: 'Priority',
  enabled: 'Enabled',
  'match.tools': 'Actions',
  'match.agentKinds': 'Agent kinds',
  'match.agentIds': 'Agents',
  'match.projectIds': 'Projects',
  'match.minRisk': 'Minimum risk',
  'match.domains': 'Areas',
  'match.classifications': 'Data labels',
  'match.operatedBy': 'Operated by',
  'match.timeWindow': 'Time window'
};

export function ChangeList({ changes }: { changes: PolicyChange[] }): JSX.Element {
  if (!changes.length) return <p className="m-0 text-xs text-slate-500">No changes.</p>;
  return (
    <table className="w-full text-left text-xs" data-testid="policy-diff">
      <tbody>
        {changes.map((c) => (
          <tr className="border-t border-slate-100 first:border-t-0" key={c.field}>
            <td className="py-1 pr-2 text-slate-500">{FIELD_LABELS[c.field] ?? c.field}</td>
            <td className="py-1 pr-2 font-mono text-red-700 line-through decoration-red-300">{showValue(c.before)}</td>
            <td className="py-1 font-mono text-green-800">{showValue(c.after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** What a policy would have done over recent activity. */
export function SimulationResultView({ result }: { result: SimulationResult }): JSX.Element {
  const changed = Object.entries(result.changed);
  const held = result.changed['allow→require_approval'] ?? 0;
  const blocked = Object.entries(result.changed)
    .filter(([k]) => k.endsWith('→deny'))
    .reduce((n, [, v]) => n + v, 0);
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3" data-testid="simulation-result">
      <div className="text-[13px] font-medium text-slate-900">
        In the last {result.days} days it would have held {held} and blocked {blocked} of {result.total} logged agent action(s).
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
        {(['allow', 'require_approval', 'deny'] as const).map((effect) => (
          <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200" key={effect}>
            {EFFECT_LABELS[effect]}: {result.current[effect]} → <strong>{result.proposed[effect]}</strong>
          </span>
        ))}
      </div>
      {changed.length ? (
        <ul className="m-0 mt-2 list-none space-y-1 p-0 text-xs text-slate-700">
          {result.samples.map((s, i) => (
            <li className="flex flex-wrap items-center gap-1.5" key={`${s.at}${i}`}>
              <span className="font-mono text-slate-500">{new Date(s.at).toLocaleDateString()}</span>
              <span className="font-medium">{s.agentName}</span>
              <code className="font-mono">{s.action}</code>
              <span>
                {EFFECT_LABELS[s.before]} <ArrowRight className="inline" size={10} /> <strong>{EFFECT_LABELS[s.after]}</strong>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 mt-2 text-xs text-slate-600">No logged action would be decided differently.</p>
      )}
      <p className="m-0 mt-2 text-[11px] text-slate-500">
        {result.note}
        {result.capped ? ' Only the latest 10,000 actions were replayed.' : ''}
      </p>
    </div>
  );
}

/** Every version of a policy, with what changed and who changed it; roll back to any of them. */
export function PolicyHistoryModal({ policy, onClose, onRolledBack }: { policy: AgentPolicy; onClose: () => void; onRolledBack: () => void }): JSX.Element {
  const { busy, run } = useAction();
  const [versions, setVersions] = useState<PolicyVersion[] | null>(null);
  const load = useCallback(() => {
    agentsApi.policyVersions(policy.id).then(setVersions).catch(() => setVersions([]));
  }, [policy.id]);
  useEffect(load, [load]);
  const applied = (versions ?? []).filter((v) => v.status === 'applied');
  const latest = applied[0]?.version;
  return (
    <Modal onClose={onClose} panelClassName="max-w-2xl" title={`History: ${policy.name}`}>
      <div className="space-y-2" data-testid="policy-history">
        {versions == null ? (
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        ) : (
          versions.map((v) => (
            <div className="rounded-lg border border-slate-200 p-3" data-testid="policy-version" key={v.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  <span className="font-mono font-semibold text-slate-900">v{v.version}</span>
                  <Badge tone={v.status === 'applied' ? (v.version === latest ? 'success' : 'neutral') : v.status === 'proposed' ? 'warning' : 'neutral'}>
                    {v.status === 'applied' ? (v.version === latest ? 'current' : v.action.replace('_', ' ')) : v.status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {userLabel(v.changedBy)} · {timeAgo(v.createdAt)}
                    {v.note ? ` · “${v.note}”` : ''}
                  </span>
                </div>
                {v.status === 'applied' && v.version !== latest && v.snapshot ? (
                  <Button
                    icon={RotateCcw}
                    loading={busy === v.id}
                    onClick={() =>
                      void run(v.id, () => agentsApi.rollbackPolicy(policy.id, v.version), `Rolled back to v${v.version}`).then((ok) => {
                        if (ok) {
                          load();
                          onRolledBack();
                        }
                      })
                    }
                    size="sm"
                    variant="secondary"
                  >
                    Roll back to v{v.version}
                  </Button>
                ) : null}
              </div>
              <div className="mt-2">
                <ChangeList changes={v.changes} />
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

/** Policy changes waiting for a second admin. */
export function PolicyProposals({ onChanged }: { onChanged: () => void }): JSX.Element | null {
  const { busy, run } = useAction();
  const [items, setItems] = useState<PolicyVersion[] | null>(null);
  const load = useCallback(() => {
    agentsApi.policyProposals().then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);
  if (!items?.length) return null;
  return (
    <Card data-testid="policy-proposals">
      <CardHeader description="Another admin reviews each change before it applies." icon={<History className="h-4 w-4 text-slate-400" />} title={`Proposed changes (${items.length})`} />
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {items.map((p) => (
          <div className="p-4" data-testid="policy-proposal" key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[13px]">
                <span className="font-medium text-slate-900">{p.snapshot?.name ?? p.previous?.name}</span>{' '}
                <span className="text-slate-500">
                  · {p.action === 'created' ? 'new policy' : p.action === 'deleted' ? 'remove' : 'change'} by {userLabel(p.changedBy)} {timeAgo(p.createdAt)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={busy === p.id}
                  onClick={() => void run(p.id, () => agentsApi.rejectProposal(p.id), p.canDecide ? 'Change rejected' : 'Change withdrawn').then((ok) => ok && (load(), onChanged()))}
                  size="sm"
                  variant="secondary"
                >
                  {p.canDecide ? 'Reject' : 'Withdraw'}
                </Button>
                {p.canDecide ? (
                  <Button
                    icon={Check}
                    loading={busy === p.id}
                    onClick={() => void run(p.id, () => agentsApi.approveProposal(p.id), 'Change approved and applied').then((ok) => ok && (load(), onChanged()))}
                    size="sm"
                    variant="primary"
                  >
                    Approve
                  </Button>
                ) : (
                  <span className="self-center text-xs text-slate-500">Waiting for another admin</span>
                )}
              </div>
            </div>
            <div className="mt-2">
              <ChangeList changes={p.changes} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Playbooks                                                           */
/* ------------------------------------------------------------------ */

const TRIGGER_LABELS: Record<string, string> = {
  threat: 'Threat',
  dlp: 'Sensitive data (DLP)',
  anomaly: 'Unusual behaviour',
  coordinated_access: 'Coordinated access',
  compliance_drift: 'Compliance drift',
  critical_risk: 'Critical risk',
  unregistered_agent: 'Shadow AI',
  key_rotation_due: 'Key rotation due'
};

const STEP_STATUS_TONE = { done: 'success', waiting: 'warning', failed: 'danger', skipped: 'neutral', pending: 'neutral' } as const;

function RunSteps({ run }: { run: PlaybookRun }): JSX.Element {
  return (
    <ol className="m-0 mt-2 flex list-none flex-wrap items-center gap-1 p-0 text-xs">
      {run.steps.map((step, i) => (
        <li className="flex items-center gap-1" key={`${step.type}${i}`} title={step.detail ?? ''}>
          {i > 0 ? <ArrowRight className="text-slate-300" size={11} /> : null}
          <Badge tone={STEP_STATUS_TONE[step.status]}>
            {step.type === 'wait_for_approval' && step.actor === 'person' ? 'A person continued' : step.label}
          </Badge>
        </li>
      ))}
    </ol>
  );
}

/** Automated response: what runs when a threat, DLP, anomaly or compliance event fires. */
export function PlaybooksPanel({ workspaceId, canAdmin }: { workspaceId: string | null; canAdmin: boolean }): JSX.Element {
  const { busy, run } = useAction();
  const [playbooks, setPlaybooks] = useState<Playbook[] | null>(null);
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [catalog, setCatalog] = useState<PlaybookTemplates | null>(null);
  const [template, setTemplate] = useState('critical_threat');
  const [custom, setCustom] = useState<{ name: string; types: string[]; minSeverity: 'info' | 'warning' | 'critical'; steps: PlaybookStepType[] } | null>(null);
  const [nextStep, setNextStep] = useState<PlaybookStepType>('notify');

  const load = useCallback(() => {
    agentsApi.playbooks(workspaceId).then(setPlaybooks).catch(() => setPlaybooks([]));
    agentsApi.playbookRuns().then(setRuns).catch(() => setRuns([]));
  }, [workspaceId]);
  useEffect(() => {
    load();
    agentsApi.playbookTemplates().then(setCatalog).catch(() => undefined);
  }, [load]);

  const after = (ok: boolean) => ok && load();
  const waiting = runs.filter((r) => r.status === 'waiting');

  return (
    <div className="space-y-4" data-testid="playbooks-panel">
      {waiting.length ? (
        <Card data-testid="playbook-waiting">
          <CardHeader description="The automatic steps ran. A person decides the rest." icon={<Workflow className="h-4 w-4 text-amber-500" />} title={`Waiting for you (${waiting.length})`} />
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {waiting.map((r) => (
              <div className="p-4" data-testid="playbook-run" key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-900">{r.trigger.title}</div>
                    <div className="text-xs text-slate-500">
                      Playbook “{r.playbookName}” · {r.agentId ? agentName(r.agentId) : 'no agent'} · {timeAgo(r.createdAt)}
                      {r.incidentId ? (
                        <>
                          {' · '}
                          <Link className="text-brand-600 hover:text-brand-700" to={`/agents/incidents?incident=${r.incidentId}`}>
                            incident
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {canAdmin ? (
                    <div className="flex gap-2">
                      <Button disabled={busy === r.id} icon={Square} onClick={() => void run(r.id, () => agentsApi.cancelRun(r.id), 'Stopped; remaining steps skipped').then(after)} size="sm" variant="secondary">
                        Stop here
                      </Button>
                      <Button icon={Play} loading={busy === r.id} onClick={() => void run(r.id, () => agentsApi.continueRun(r.id), 'Continued').then(after)} size="sm" variant="primary">
                        Continue: {r.steps.slice(r.steps.findIndex((s) => s.status === 'waiting') + 1).map((s) => s.label.toLowerCase()).join(', ') || 'finish'}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <RunSteps run={r} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          description="Automatic steps run at once; a “Wait for a person” step pauses the run. Every step is logged."
          icon={<Workflow className="h-4 w-4 text-slate-400" />}
          title="Playbooks"
        />
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {playbooks == null ? (
            <div className="m-4 h-16 animate-pulse rounded bg-slate-100" />
          ) : playbooks.length === 0 ? (
            <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">No playbooks yet. Start from a template below.</p>
          ) : (
            playbooks.map((p) => (
              <div className="flex flex-wrap items-start justify-between gap-3 p-4" data-testid="playbook" key={p.id}>
                <div className="min-w-0 flex-1 basis-72">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <span className="text-xs text-slate-500">
                      on {p.trigger.types.map((t) => TRIGGER_LABELS[t] ?? t).join(', ')} ({p.trigger.minSeverity}+) · ran {p.runCount} time(s)
                      {p.lastRunAt ? `, last ${timeAgo(p.lastRunAt)}` : ''}
                    </span>
                  </div>
                  <ol className="m-0 mt-1.5 flex list-none flex-wrap items-center gap-1 p-0 text-xs">
                    {p.steps.map((s, i) => (
                      <li className="flex items-center gap-1" key={`${s.type}${i}`}>
                        {i > 0 ? <ArrowRight className="text-slate-300" size={11} /> : null}
                        <Badge tone={s.type === 'wait_for_approval' ? 'warning' : 'neutral'}>{s.label ?? s.type}</Badge>
                      </li>
                    ))}
                  </ol>
                </div>
                {canAdmin ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      aria-label={`${p.name} enabled`}
                      checked={p.enabled}
                      disabled={busy === p.id}
                      onChange={() => void run(p.id, () => agentsApi.updatePlaybook(p.id, { enabled: !p.enabled }), p.enabled ? 'Playbook paused' : 'Playbook on').then(after)}
                    />
                    <Button aria-label={`Remove ${p.name}`} icon={Trash2} onClick={() => void run(p.id, () => agentsApi.deletePlaybook(p.id), 'Playbook removed').then(after)} size="sm" variant="ghost" />
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        {canAdmin && catalog ? (
          <div className="space-y-3 border-t border-slate-100 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <Field className="min-w-0 flex-1 basis-64" label="Start from a template">
                <Select
                  onValueChange={setTemplate}
                  options={catalog.templates.map((t) => ({ value: t.key, label: `${t.name}: ${t.steps.map((s) => s.label.toLowerCase()).join(' → ')}` }))}
                  value={template}
                />
              </Field>
              <Button icon={Plus} loading={busy === 'tpl'} onClick={() => void run('tpl', () => agentsApi.createPlaybook({ template }, workspaceId), 'Playbook added').then(after)} variant="primary">
                Add playbook
              </Button>
              <Button onClick={() => setCustom(custom ? null : { name: '', types: ['threat'], minSeverity: 'critical', steps: ['suspend_agent', 'notify'] })} variant="secondary">
                {custom ? 'Cancel' : 'Build your own'}
              </Button>
            </div>
            {custom ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3" data-testid="playbook-builder">
                <Field label="Name">
                  <Input onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="e.g. Vendor agent misbehaves" value={custom.name} />
                </Field>
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-700">When</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {catalog.triggers.map((t) => (
                      <label className="flex items-center gap-1.5 text-[13px] text-slate-700" key={t}>
                        <Checkbox
                          checked={custom.types.includes(t)}
                          onChange={() => setCustom({ ...custom, types: custom.types.includes(t) ? custom.types.filter((x) => x !== t) : [...custom.types, t] })}
                        />
                        {TRIGGER_LABELS[t] ?? t}
                      </label>
                    ))}
                  </div>
                  <Select
                    aria-label="Minimum severity"
                    className="mt-2 w-48"
                    onValueChange={(v) => setCustom({ ...custom, minSeverity: v as 'info' | 'warning' | 'critical' })}
                    options={[
                      { value: 'critical', label: 'Critical only' },
                      { value: 'warning', label: 'Warning and above' },
                      { value: 'info', label: 'Everything' }
                    ]}
                    value={custom.minSeverity}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-700">Then</div>
                  <ol className="m-0 list-none space-y-1 p-0">
                    {custom.steps.map((s, i) => (
                      <li className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[13px]" key={`${s}${i}`}>
                        <span>
                          {i + 1}. {catalog.steps.find((x) => x.type === s)?.label ?? s}
                        </span>
                        <Button aria-label="Remove step" icon={X} onClick={() => setCustom({ ...custom, steps: custom.steps.filter((_, j) => j !== i) })} size="sm" variant="ghost" />
                      </li>
                    ))}
                  </ol>
                  <div className="mt-2 flex gap-2">
                    <Select className="w-72" onValueChange={(v) => setNextStep(v as PlaybookStepType)} options={catalog.steps.map((s) => ({ value: s.type, label: s.label }))} value={nextStep} />
                    <Button icon={Plus} onClick={() => setCustom({ ...custom, steps: [...custom.steps, nextStep] })} size="sm" variant="secondary">
                      Add step
                    </Button>
                  </div>
                </div>
                <Button
                  disabled={!custom.name.trim() || !custom.types.length || !custom.steps.length}
                  loading={busy === 'custom'}
                  onClick={() =>
                    void run('custom', () => agentsApi.createPlaybook({ name: custom.name, trigger: { types: custom.types, minSeverity: custom.minSeverity }, steps: custom.steps }, workspaceId), 'Playbook added').then(
                      (ok) => ok && (setCustom(null), load())
                    )
                  }
                  variant="primary"
                >
                  Save playbook
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      {runs.filter((r) => r.status !== 'waiting').length ? (
        <Card>
          <CardHeader icon={<Clock className="h-4 w-4 text-slate-400" />} title="Recent runs" />
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {runs
              .filter((r) => r.status !== 'waiting')
              .slice(0, 15)
              .map((r) => (
                <div className="px-4 py-3" data-testid="playbook-run-history" key={r.id}>
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-medium text-slate-900">{r.playbookName}</span>
                    <Badge tone={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'neutral'}>{r.status}</Badge>
                    <span className="text-xs text-slate-500">
                      {r.trigger.title} · {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  <RunSteps run={r} />
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
