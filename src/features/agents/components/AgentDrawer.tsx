import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, EyeOff, Gauge, History, KeyRound, Network, Pause, Play, RotateCw, ShieldCheck, X } from 'lucide-react';

import { Badge, Button, Tabs, cn, inputClass, selectClass } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import {
  agentsApi,
  DETECTION_SIGNAL_LABELS,
  SCOPE_LABELS,
  timeAgo,
  userLabel,
  type AgentActivity,
  type AgentDetail
} from '@/services/agents';
import type { Project } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { CreateKeyModal, ProjectPicker, ScopePicker } from './CreateKeyModal';
import { ReachPanel } from './ReachPanel';
import { ActionRiskBadge, KindLabel, OutcomeBadge, RiskBadge, SecretReveal, StatusBadge } from './shared';

type DrawerTab = 'overview' | 'permissions' | 'reach' | 'activity' | 'risk';

interface AgentDrawerProps {
  agentId: string;
  projects: Project[];
  canAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function AgentDrawer({ agentId, projects, canAdmin, onClose, onChanged }: AgentDrawerProps): JSX.Element | null {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [activity, setActivity] = useState<AgentActivity[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [restricted, setRestricted] = useState(false);
  const [expiry, setExpiry] = useState<string>('keep');
  const [replacing, setReplacing] = useState(false);
  /** Calls per minute as typed; empty means no limit. */
  const [rateLimit, setRateLimit] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      try {
        const detail = await agentsApi.get(agentId, refresh);
        setAgent(detail);
        setScopes(detail.scopes);
        setProjectIds(detail.projectIds.map(String));
        setRestricted(detail.projectIds.length > 0);
        setRateLimit(detail.rateLimitPerMinute ? String(detail.rateLimitPerMinute) : '');
      } catch (error) {
        showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
        onClose();
      }
    },
    [agentId, onClose, showToast]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'activity' || activity) return;
    agentsApi
      .activity({ agentId, limit: 100 })
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [tab, agentId, activity]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      showToast({ variant: 'success', message });
      await load(true);
      onChanged();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const savePermissions = () =>
    act(
      () =>
        agentsApi.update(agentId, {
          // AI providers have no scopes or projects to set.
          ...(agent?.kind === 'ai_provider' ? {} : { scopes, projectIds }),
          rateLimitPerMinute: rateLimit.trim() ? Number(rateLimit) : null,
          ...(expiry === 'keep'
            ? {}
            : { expiresAt: expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 86400000).toISOString() })
        }),
      'Permissions saved'
    );

  if (typeof document === 'undefined') return null;

  const maxDaily = Math.max(1, ...(agent?.usage.daily.map((d) => d.calls) ?? [1]));
  const revoked = agent?.status === 'revoked';
  const ownerId = agent && typeof agent.ownerUserId === 'object' ? agent.ownerUserId._id : agent?.ownerUserId;
  // Only the owner can get a new secret; admins suspend or revoke instead.
  const isOwner = Boolean(user?.id && ownerId === user.id && agent?.kind !== 'ai_provider');
  const lockedByAdmin = Boolean(agent?.statusSetByAdmin && agent.status !== 'active' && !canAdmin);
  // An admin narrowed this agent: its owner may narrow it further, not widen it.
  const permissionsLocked = Boolean(agent?.adminLocked && !canAdmin);
  const emptyRestriction = restricted && projectIds.length === 0;
  const unregistered = agent?.kind === 'detected';

  // The key form replaces the drawer while open (the drawer sits above modals).
  if (replacing && agent) {
    return (
      <CreateKeyModal
        canAdmin={canAdmin}
        onClose={() => {
          setReplacing(false);
          void load(true);
        }}
        onCreated={() => onChanged()}
        projects={projects}
        replaceAgent={agent}
        workspaceId={agent.workspaceId}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[900] flex justify-end" role="dialog" aria-modal="true" aria-label="Agent details">
      <button aria-label="Close" className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} type="button" />
      <aside className="relative flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {!agent ? (
          <div className="space-y-3 p-5">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-lg font-semibold tracking-tight text-slate-900">{agent.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <KindLabel kind={agent.kind} />
                    <StatusBadge status={agent.status} />
                    <RiskBadge level={agent.riskLevel} score={agent.riskScore} />
                    {agent.legacy ? <Badge tone="orange">Legacy key</Badge> : null}
                  </div>
                </div>
                <Button aria-label="Close" icon={X} onClick={onClose} size="icon-sm" variant="ghost" />
              </div>
              <Tabs
                className="mt-3"
                items={[
                  { value: 'overview', label: 'Overview', icon: Gauge },
                  { value: 'permissions', label: 'Permissions', icon: ShieldCheck },
                  { value: 'reach', label: 'Reach', icon: Network },
                  { value: 'activity', label: 'Activity', icon: History },
                  { value: 'risk', label: 'Risk', icon: Ban, count: agent.riskFactors.length }
                ]}
                onChange={setTab}
                value={tab}
              />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {tab === 'overview' ? (
                <>
                  {unregistered && !revoked ? (
                    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3" data-testid="unregistered-explainer">
                      <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-amber-900">
                        <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                        Unregistered agent: it runs with {userLabel(agent.ownerUserId)}&apos;s own login instead of an agent key.
                      </p>
                      <ul className="m-0 list-disc space-y-0.5 pl-9 text-xs text-amber-900/90">
                        {(agent.detectionSignals ?? []).map((signal) => (
                          <li key={signal}>{DETECTION_SIGNAL_LABELS[signal] ?? signal}</li>
                        ))}
                        {agent.userAgent ? (
                          <li>
                            User agent: <code className="break-all font-mono">{agent.userAgent}</code>
                          </li>
                        ) : null}
                      </ul>
                      <p className="m-0 pl-6 text-xs text-amber-900/90">
                        {isOwner
                          ? 'Give it its own key so it gets only the access it needs and can be revoked without signing you out. Or block it.'
                          : 'Its owner can give it its own key. You can block it.'}
                      </p>
                    </div>
                  ) : null}
                  {agent.reviewDue && !revoked && !unregistered ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5" data-testid="review-due">
                      <span className="text-[13px] text-sky-900">Access review due: does this agent still need its access?</span>
                      <Button loading={busy} onClick={() => void act(() => agentsApi.review(agentId), 'Confirmed for another 90 days')} size="sm" variant="primary">
                        Still needed
                      </Button>
                    </div>
                  ) : null}
                  {agent.statusReason ? (
                    <p className="m-0 rounded-lg bg-amber-50 p-2.5 text-[13px] text-amber-800">Reason: {agent.statusReason}</p>
                  ) : null}
                  {newKey ? (
                    <div className="space-y-1.5">
                      <p className="m-0 text-[13px] font-medium text-slate-700">New key (shown once)</p>
                      <SecretReveal value={newKey} />
                    </div>
                  ) : null}
                  <dl className="m-0 grid grid-cols-2 gap-3 text-[13px]">
                    {[
                      ['Owner', userLabel(agent.ownerUserId)],
                      ['Last active', timeAgo(agent.lastSeenAt)],
                      ['Calls', agent.callCount.toLocaleString()],
                      ['Expires', agent.expiresAt ? new Date(agent.expiresAt).toLocaleDateString() : 'Never'],
                      ['Key', agent.keyPrefix ? `${agent.keyPrefix}…` : '—'],
                      ['Access confirmed', agent.reviewedAt ? timeAgo(agent.reviewedAt) : 'Never'],
                      ['Client', agent.clientName || agent.userAgent || '—']
                    ].map(([label, value]) => (
                      <div className="min-w-0 rounded-lg border border-slate-200 p-2.5" key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="m-0 mt-0.5 truncate font-medium text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-slate-700">Last 30 days</span>
                      <span className="flex gap-2 text-xs text-slate-500">
                        <span>{agent.usage.outcomes.allowed ?? 0} allowed</span>
                        <span className="text-red-600">{agent.usage.outcomes.blocked ?? 0} blocked</span>
                        <span className="text-amber-600">{agent.usage.outcomes.pending_approval ?? 0} held</span>
                      </span>
                    </div>
                    {agent.usage.daily.length === 0 ? (
                      <p className="m-0 mt-3 text-xs text-slate-500">No activity yet.</p>
                    ) : (
                      <div className="mt-3 flex h-16 items-end gap-0.5" aria-label="Calls per day">
                        {agent.usage.daily.map((day) => (
                          <div
                            className="min-w-[4px] flex-1 rounded-t bg-emerald-400/80"
                            key={day.date}
                            style={{ height: `${Math.max(6, (day.calls / maxDaily) * 100)}%` }}
                            title={`${day.date}: ${day.calls} calls`}
                          />
                        ))}
                      </div>
                    )}
                    {agent.usage.ai ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
                        <div>
                          <div className="text-base font-semibold text-slate-900 tabular-nums">{agent.usage.ai.calls}</div>
                          AI calls
                        </div>
                        <div>
                          <div className="text-base font-semibold text-slate-900 tabular-nums">{agent.usage.ai.tokens.toLocaleString()}</div>
                          tokens
                        </div>
                        <div>
                          <div className="text-base font-semibold text-slate-900 tabular-nums">${agent.usage.ai.cost.toFixed(2)}</div>
                          cost
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {!revoked ? (
                    <div className="flex flex-wrap gap-2">
                      {agent.status === 'active' ? (
                        <Button
                          icon={Pause}
                          loading={busy}
                          onClick={() =>
                            void act(
                              () => agentsApi.suspend(agentId, unregistered ? 'Blocked from using a personal login' : 'Suspended from the portal'),
                              unregistered ? `${agent.name} blocked` : `${agent.name} suspended`
                            )
                          }
                        >
                          {unregistered ? 'Block' : 'Suspend'}
                        </Button>
                      ) : lockedByAdmin ? (
                        <p className="m-0 w-full rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                          A workspace admin suspended this agent. Ask an admin to resume it.
                        </p>
                      ) : (
                        <Button icon={Play} loading={busy} onClick={() => void act(() => agentsApi.resume(agentId), `${agent.name} resumed`)}>
                          Resume
                        </Button>
                      )}
                      {unregistered && isOwner ? (
                        <Button icon={KeyRound} loading={busy} onClick={() => setReplacing(true)} variant="primary">
                          Give it its own key
                        </Button>
                      ) : null}
                      {agent.kind === 'api_key' && isOwner && agent.status === 'active' ? (
                        <Button
                          icon={RotateCw}
                          loading={busy}
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Rotate key?',
                              message: 'The current key stops working immediately. Update the client with the new key.',
                              confirmText: 'Rotate'
                            });
                            if (!ok) return;
                            await act(async () => setNewKey((await agentsApi.rotate(agentId)).key), 'Key rotated');
                          }}
                        >
                          Rotate key
                        </Button>
                      ) : null}
                      <Button
                        icon={KeyRound}
                        loading={busy}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Revoke ${agent.name}?`,
                            message: 'The agent loses access for good. This cannot be undone.',
                            confirmText: 'Revoke',
                            type: 'danger'
                          });
                          if (ok) await act(() => agentsApi.revoke(agentId, 'Revoked from the portal'), `${agent.name} revoked`);
                        }}
                        variant="danger"
                      >
                        Revoke
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {tab === 'permissions' ? (
                <>
                  {permissionsLocked ? (
                    <p className="m-0 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                      A workspace admin set these permissions. You can remove access, but only an admin can add it back.
                    </p>
                  ) : null}
                  <div className="grid gap-1.5">
                    <span className="text-[13px] font-medium text-slate-700">Scopes</span>
                    {agent.kind === 'ai_provider' ? (
                      <p className="m-0 text-[13px] text-slate-500">AI providers only receive prompts; they cannot call tools.</p>
                    ) : (
                      <ScopePicker canAdmin={canAdmin} onChange={setScopes} value={scopes} />
                    )}
                  </div>
                  {agent.kind !== 'ai_provider' ? (
                    <div className="grid gap-1.5">
                      <span className="text-[13px] font-medium text-slate-700">Projects it can change</span>
                      <ProjectPicker
                        onChange={setProjectIds}
                        onRestrictedChange={setRestricted}
                        projects={projects}
                        restricted={restricted}
                        value={projectIds}
                      />
                    </div>
                  ) : null}
                  {agent.kind === 'api_key' ? (
                    <label className="grid gap-1">
                      <span className="text-[13px] font-medium text-slate-700">Expiry</span>
                      <select className={selectClass} onChange={(e) => setExpiry(e.target.value)} value={expiry}>
                        <option value="keep">Keep ({agent.expiresAt ? new Date(agent.expiresAt).toLocaleDateString() : 'never'})</option>
                        <option value="30">30 days from now</option>
                        <option value="90">90 days from now</option>
                        <option value="365">1 year from now</option>
                        <option value="never">Never</option>
                      </select>
                    </label>
                  ) : null}
                  <label className="grid gap-1">
                    <span className="text-[13px] font-medium text-slate-700">Rate limit</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="w-32 shrink-0">
                        <input
                          aria-label="Calls per minute"
                          className={cn(inputClass, 'h-9 tabular-nums')}
                          inputMode="numeric"
                          onChange={(e) => setRateLimit(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="No limit"
                          value={rateLimit}
                        />
                      </span>
                      <span className="text-xs text-slate-500">calls per minute across REST, MCP and AI; empty for no limit</span>
                    </span>
                  </label>
                  {!revoked ? (
                    <Button
                      disabled={emptyRestriction || (rateLimit !== '' && (Number(rateLimit) < 1 || Number(rateLimit) > 10000))}
                      loading={busy}
                      onClick={() => void savePermissions()}
                      variant="primary"
                    >
                      Save permissions
                    </Button>
                  ) : null}
                  <ul className="m-0 list-none space-y-1 p-0 text-xs text-slate-500">
                    {scopes.map((scope) => (
                      <li key={scope}>
                        <code className="font-mono text-slate-700">{scope}</code> {SCOPE_LABELS[scope]?.description}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {tab === 'activity' ? (
                activity == null ? (
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                ) : activity.length === 0 ? (
                  <p className="m-0 text-[13px] text-slate-500">No recorded actions yet.</p>
                ) : (
                  <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
                    {activity.map((row) => (
                      <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" key={row.id}>
                        <div className="min-w-0">
                          <code className="font-mono text-[13px] text-slate-900">{row.action}</code>
                          <div className="text-xs text-slate-500">
                            {timeAgo(row.createdAt)} · {row.channel.toUpperCase()}
                            {row.policyName ? ` · ${row.policyName}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ActionRiskBadge risk={row.risk} />
                          <OutcomeBadge outcome={row.outcome} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}

              {tab === 'reach' ? <ReachPanel agent={agent} onChanged={() => void load(true).then(onChanged)} /> : null}

              {tab === 'risk' ? (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <div className="text-xs text-slate-500">Risk score</div>
                      <div className="text-2xl font-semibold tabular-nums text-slate-900">{agent.riskScore}/100</div>
                    </div>
                    <Button icon={RotateCw} loading={busy} onClick={() => void load(true)} size="sm">
                      Re-assess
                    </Button>
                  </div>
                  {agent.riskFactors.length === 0 ? (
                    <p className="m-0 text-[13px] text-slate-500">No risk factors. This agent follows least privilege.</p>
                  ) : (
                    <ul className="m-0 list-none space-y-2 p-0">
                      {agent.riskFactors.map((factor) => (
                        <li className="rounded-lg border border-slate-200 p-3" key={factor.code}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-medium text-slate-900">{factor.label}</span>
                            <span className={cn('text-xs font-semibold tabular-nums', factor.weight >= 20 ? 'text-red-600' : 'text-amber-600')}>
                              +{factor.weight}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {factor.frameworks.map((framework) => (
                              <Badge key={framework} tone="neutral">
                                {framework}
                              </Badge>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="m-0 text-xs text-slate-400">
                    Framework references help reviews; they are not a certification.
                  </p>
                </>
              ) : null}
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body
  );
}
