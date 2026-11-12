import { useEffect, useMemo, useState } from 'react';
import { Download, FlaskConical, History, Pencil, Plus, ScrollText, Trash2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { Badge, Button, Card, CardHeader, Field, cn, selectClass, Select, Checkbox, Input, Textarea } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentsApi, CLASSIFICATION_LABELS, EFFECT_LABELS, KIND_LABELS, RISK_LEVEL_LABELS, type AgentKind, type AgentPolicy, type Classification, type PolicyEffect, type PolicyTemplate, type RiskLevel, type SimulationResult, type ToolCatalog } from '@/services/agents';
import type { Project } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { EffectBadge } from './shared';
import { PolicyHistoryModal, PolicyProposals, SimulationResultView } from './AdvancedGovernance';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS = Object.keys(KIND_LABELS) as AgentKind[];
const RISKS = Object.keys(RISK_LEVEL_LABELS) as RiskLevel[];

type Draft = Omit<AgentPolicy, 'id'>;

const emptyDraft = (): Draft => ({
  name: '',
  description: '',
  effect: 'require_approval',
  mode: 'advisory',
  priority: 100,
  enabled: true,
  match: {}
});

/** One line describing what a policy matches, for the list. */
export function describeMatch(policy: Pick<AgentPolicy, 'match'>, projects: Project[]): string {
  const m = policy.match ?? {};
  const parts: string[] = [];
  parts.push(m.agentKinds?.length ? m.agentKinds.map((k) => KIND_LABELS[k]).join(', ') : 'Any agent');
  if (m.tools?.length) parts.push(m.tools.join(', '));
  if (m.minRisk) parts.push(`${RISK_LEVEL_LABELS[m.minRisk].toLowerCase()} or riskier`);
  if (m.projectIds?.length) {
    const names = m.projectIds.map((id) => projects.find((p) => p.id === id)?.name ?? 'a project');
    parts.push(`in ${names.join(', ')}`);
  }
  if (m.classifications?.length) parts.push(`${m.classifications.map((c) => CLASSIFICATION_LABELS[c].label.toLowerCase()).join(' or ')} data`);
  if (m.operatedBy?.length) parts.push(m.operatedBy.includes('vendor') ? 'third-party agents' : 'own agents');
  if (m.timeWindow) {
    const w = m.timeWindow;
    const days = w.days?.length ? w.days.map((d) => DAYS[d]).join(' ') : 'every day';
    parts.push(`${w.outside ? 'outside' : 'during'} ${days} ${w.startHour ?? 0}:00–${w.endHour ?? 24}:00 ${w.timezone ?? 'UTC'}`);
  }
  return parts.join(' · ');
}

function PolicyEditor({
  initial,
  policyId,
  workspaceId,
  catalog,
  projects,
  onClose,
  onSave
}: {
  initial: Draft;
  policyId: string | null;
  workspaceId: string | null;
  catalog: ToolCatalog | null;
  projects: Project[];
  onClose: () => void;
  onSave: (draft: Draft) => Promise<void>;
}): JSX.Element {
  const [draft, setDraft] = useState<Draft>(initial);
  const [toolsText, setToolsText] = useState((initial.match.tools ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const current = (): Draft => {
    const tools = toolsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return { ...draft, match: { ...draft.match, tools: tools.length ? tools : undefined } };
  };
  const simulate = async () => {
    setSimulating(true);
    setSimError(null);
    try {
      setSimulation(await agentsApi.simulatePolicy({ policy: current(), policyId: policyId ?? undefined, days: 7 }, workspaceId));
    } catch (error) {
      setSimError(toDisplayErrorMessage(error));
    } finally {
      setSimulating(false);
    }
  };
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setMatch = (patch: Partial<Draft['match']>) => setDraft((d) => ({ ...d, match: { ...d.match, ...patch } }));
  const tw = draft.match.timeWindow;
  const toolSuggestions = useMemo(() => catalog?.tools.map((t) => t.name) ?? [], [catalog]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(current());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button icon={FlaskConical} loading={simulating} onClick={() => void simulate()} title="Replay the last 7 days of agent activity against this policy">
            Simulate on last 7 days
          </Button>
          <Button disabled={!draft.name.trim()} loading={saving} onClick={() => void save()} variant="primary">
            Save policy
          </Button>
        </>
      }
      maxWidth="max-w-[680px]"
      onClose={onClose}
      title={initial.name ? 'Edit policy' : 'New policy'}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Field label="Name">
            <Input onChange={(e) => set({ name: e.target.value })} value={draft.name} />
          </Field>
          <Field hint="Higher runs first" label="Priority">
            <Input
              max={1000}
              min={0}
              onChange={(e) => set({ priority: Number(e.target.value) })}
              type="number"
              value={draft.priority}
            />
          </Field>
        </div>
        <Field label="Description">
          <Textarea onChange={(e) => set({ description: e.target.value })} rows={2} value={draft.description ?? ''} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Then">
            <Select className={selectClass} onChange={(e) => set({ effect: e.target.value as PolicyEffect })} value={draft.effect}>
              {(Object.keys(EFFECT_LABELS) as PolicyEffect[]).map((effect) => (
                <option key={effect} value={effect}>
                  {EFFECT_LABELS[effect]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            hint={
              draft.mode === 'advisory'
                ? 'Logs what would happen without blocking.'
                : draft.mode === 'simulation'
                  ? 'A draft: never applied; replay it with Simulate.'
                  : 'Applied to every matching call.'
            }
            label="Mode"
          >
            <Select className={selectClass} onChange={(e) => set({ mode: e.target.value as Draft['mode'] })} value={draft.mode}>
              <option value="simulation">Draft (simulation only)</option>
              <option value="advisory">Advisory (log only)</option>
              <option value="enforce">Enforce</option>
            </Select>
          </Field>
        </div>

        <fieldset className="m-0 space-y-3 rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-[13px] font-medium text-slate-700">When</legend>
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-600">Agent types (none selected means all)</span>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((kind) => {
                const on = draft.match.agentKinds?.includes(kind) ?? false;
                return (
                  <button
                    className={cn(
                      'h-7 rounded-full border px-2.5 text-xs font-medium',
                      on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                    key={kind}
                    onClick={() => {
                      const current = draft.match.agentKinds ?? [];
                      const next = on ? current.filter((k) => k !== kind) : [...current, kind];
                      setMatch({ agentKinds: next.length ? next : undefined });
                    }}
                    type="button"
                  >
                    {KIND_LABELS[kind]}
                  </button>
                );
              })}
            </div>
          </div>
          <Field hint='Comma separated; * is a wildcard, e.g. "task:*" or "*:delete".' label="Actions">
            <Input list="agent-tool-names" onChange={(e) => setToolsText(e.target.value)} placeholder="Any action" value={toolsText} />
            <datalist id="agent-tool-names">
              {toolSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Minimum risk">
              <Select
                className={selectClass}
                onChange={(e) => setMatch({ minRisk: (e.target.value || undefined) as RiskLevel | undefined })}
                value={draft.match.minRisk ?? ''}
              >
                <option value="">Any</option>
                {RISKS.map((risk) => (
                  <option key={risk} value={risk}>
                    {RISK_LEVEL_LABELS[risk]} or riskier
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project">
              <Select
                className={selectClass}
                onChange={(e) => setMatch({ projectIds: e.target.value ? [e.target.value] : undefined })}
                value={draft.match.projectIds?.[0] ?? ''}
              >
                <option value="">Any project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">Data labels (none selected means any)</span>
              <div className="flex flex-wrap gap-1.5">
                {(['public', 'internal', 'confidential', 'restricted'] as Classification[]).map((label) => {
                  const on = draft.match.classifications?.includes(label) ?? false;
                  return (
                    <button
                      aria-pressed={on}
                      className={cn(
                        'h-7 rounded-full border px-2.5 text-xs font-medium',
                        on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                      key={label}
                      onClick={() => {
                        const list = draft.match.classifications ?? [];
                        const next = on ? list.filter((l) => l !== label) : [...list, label];
                        setMatch({ classifications: next.length ? next : undefined });
                      }}
                      type="button"
                    >
                      {CLASSIFICATION_LABELS[label].label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Operated by">
              <Select
                className={selectClass}
                onChange={(e) => setMatch({ operatedBy: e.target.value ? [e.target.value as 'internal' | 'vendor'] : undefined })}
                value={draft.match.operatedBy?.[0] ?? ''}
              >
                <option value="">Anyone</option>
                <option value="internal">Our own agents</option>
                <option value="vendor">Third parties (vendors)</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <Checkbox
              checked={Boolean(tw)}
              onChange={(e) =>
                setMatch({
                  timeWindow: e.target.checked
                    ? { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, outside: true }
                    : undefined
                })
              }
            />
            Limit to a time window
          </label>
          {tw ? (
            <div className="grid gap-2 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-2">
              <Select
                className={selectClass}
                onChange={(e) => setMatch({ timeWindow: { ...tw, outside: e.target.value === 'outside' } })}
                value={tw.outside ? 'outside' : 'inside'}
              >
                <option value="outside">Outside these hours</option>
                <option value="inside">During these hours</option>
              </Select>
              <Input
                onChange={(e) => setMatch({ timeWindow: { ...tw, timezone: e.target.value } })}
                placeholder="UTC"
                value={tw.timezone ?? 'UTC'}
              />
              <div className="flex items-center gap-2 text-[13px] text-slate-600">
                <Input
                  max={24}
                  min={0}
                  onChange={(e) => setMatch({ timeWindow: { ...tw, startHour: Number(e.target.value) } })}
                  type="number"
                  value={tw.startHour ?? 0}
                />
                to
                <Input
                  max={24}
                  min={0}
                  onChange={(e) => setMatch({ timeWindow: { ...tw, endHour: Number(e.target.value) } })}
                  type="number"
                  value={tw.endHour ?? 24}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((day, index) => {
                  const on = tw.days?.includes(index) ?? false;
                  return (
                    <button
                      className={cn('h-7 w-9 rounded-md border text-xs', on ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500')}
                      key={day}
                      onClick={() =>
                        setMatch({
                          timeWindow: { ...tw, days: on ? (tw.days ?? []).filter((d) => d !== index) : [...(tw.days ?? []), index] }
                        })
                      }
                      type="button"
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </fieldset>
        {simulation ? (
          <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>
            <SimulationResultView result={simulation} />
          </div>
        ) : null}
        {simError ? <p className="m-0 text-[13px] text-red-600">{simError}</p> : null}
      </div>
    </Modal>
  );
}

function DryRun({ catalog, workspaceId }: { catalog: ToolCatalog | null; workspaceId: string | null }): JSX.Element {
  const [action, setAction] = useState('task:delete');
  const [kind, setKind] = useState<AgentKind>('mcp_client');
  const [result, setResult] = useState<Awaited<ReturnType<typeof agentsApi.testPolicies>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    try {
      setResult(await agentsApi.testPolicies({ action, agentKind: kind }, workspaceId));
    } catch (err) {
      setError(toDisplayErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader description="Check what would happen to a call right now, without running it." icon={<FlaskConical className="h-4 w-4 text-slate-400" />} title="Test policies" />
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <Field label="Action">
          <Input list="agent-tool-names-test" onChange={(e) => setAction(e.target.value)} value={action} />
          <datalist id="agent-tool-names-test">
            {catalog?.tools.map((tool) => <option key={tool.name} value={tool.name} />)}
          </datalist>
        </Field>
        <Field label="Agent type">
          <Select className={selectClass} onChange={(e) => setKind(e.target.value as AgentKind)} value={kind}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Button icon={FlaskConical} onClick={() => void run()} variant="dark">
          Test
        </Button>
      </div>
      {result || error ? (
        <div className="border-t border-slate-100 px-4 py-3 text-[13px]" data-testid="policy-test-result">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : result ? (
            <div className="flex flex-wrap items-center gap-2">
              <EffectBadge effect={result.effect} />
              <span className="text-slate-600">
                {result.policy ? `by "${result.policy.name}"` : 'No enforced policy matches; allowed by default.'}
              </span>
              {result.advisory.length ? (
                <span className="text-xs text-slate-500">Advisory: {result.advisory.map((p) => p.name).join(', ')}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function PoliciesPanel({ workspaceId, projects, canAdmin }: { workspaceId: string | null; projects: Project[]; canAdmin: boolean }): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [policies, setPolicies] = useState<AgentPolicy[] | null>(null);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [catalog, setCatalog] = useState<ToolCatalog | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [history, setHistory] = useState<AgentPolicy | null>(null);
  const [proposalsKey, setProposalsKey] = useState(0);

  const load = async () => {
    try {
      setPolicies(await agentsApi.policies(workspaceId));
    } catch (error) {
      setPolicies([]);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  useEffect(() => {
    if (!canAdmin) return;
    void load();
    agentsApi.templates().then(setTemplates).catch(() => undefined);
    agentsApi.catalog().then(setCatalog).catch(() => undefined);
  }, [workspaceId, canAdmin]);

  if (!canAdmin) {
    return <EmptyState description="Workspace owners and admins set agent policies." icon={ScrollText} title="Policies are managed by admins" />;
  }

  /** With change approval on, saves come back as proposals for another admin. */
  const proposed = (result: unknown) => Boolean(result && typeof result === 'object' && 'proposal' in result);
  const changed = async (result: unknown, message: string) => {
    showToast({ variant: 'success', message: proposed(result) ? 'Proposed: another admin must approve it before it applies' : message });
    setProposalsKey((k) => k + 1);
    await load();
  };

  const save = async (draft: Draft) => {
    try {
      const result = editing?.id ? await agentsApi.updatePolicy(editing.id, draft) : await agentsApi.createPolicy(draft, workspaceId);
      setEditing(null);
      await changed(result, 'Policy saved');
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  const unused = templates.filter((t) => !policies?.some((p) => p.name === t.name));

  return (
    <div className="space-y-4">
      <PolicyProposals key={proposalsKey} onChanged={() => void load()} />
      <Card>
        <CardHeader
          actions={
            <div className="flex gap-2">
              <Button icon={Download} onClick={() => void agentsApi.exportPolicies(workspaceId).catch((error) => showToast({ variant: 'error', message: toDisplayErrorMessage(error) }))} size="sm" title="Every policy as JSON, with its version">
                Export
              </Button>
              <Button icon={Plus} onClick={() => setEditing({ id: null, draft: emptyDraft() })} size="sm" variant="primary">
                New policy
              </Button>
            </div>
          }
          description="Highest priority first. The first enforced match decides; advisory policies only log."
          icon={<ScrollText className="h-4 w-4 text-slate-400" />}
          title="Agent policies"
        />
        {policies == null ? (
          <div className="space-y-2 p-4">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : policies.length === 0 ? (
          <div className="p-4">
            <EmptyState compact description="Without policies every agent call within its scopes is allowed. Start from a template below." icon={ScrollText} title="No policies yet" />
          </div>
        ) : (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {policies.map((policy) => (
              <li className={cn('flex flex-wrap items-center justify-between gap-3 px-4 py-3', !policy.enabled && 'opacity-60')} key={policy.id}>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-900">{policy.name}</span>
                    <EffectBadge effect={policy.effect} />
                    <Badge tone={policy.mode === 'enforce' ? 'dark' : policy.mode === 'simulation' ? 'violet' : 'neutral'}>
                      {policy.mode === 'enforce' ? 'Enforced' : policy.mode === 'simulation' ? 'Draft' : 'Advisory'}
                    </Badge>
                    {!policy.enabled ? <Badge>Off</Badge> : null}
                    {policy.pendingChanges ? <Badge tone="warning">Change waiting for approval</Badge> : null}
                    <span className="text-xs tabular-nums text-slate-400">
                      #{policy.priority} · v{policy.version ?? 1}
                    </span>
                  </div>
                  <p className="m-0 truncate text-xs text-slate-500">{describeMatch(policy, projects)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Checkbox
                      aria-label={`Enable ${policy.name}`}
                      checked={policy.enabled}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        setPolicies((current) => current?.map((p) => (p.id === policy.id ? { ...p, enabled } : p)) ?? current);
                        try {
                          const result = await agentsApi.updatePolicy(policy.id, { enabled });
                          if (proposed(result)) await changed(result, '');
                        } catch (error) {
                          showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                          await load();
                        }
                      }}
                    />
                    On
                  </label>
                  {policy.mode === 'advisory' ? (
                    <Button
                      onClick={async () => {
                        try {
                          await changed(await agentsApi.updatePolicy(policy.id, { mode: 'enforce' }), `"${policy.name}" is now enforced`);
                        } catch (error) {
                          showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                        }
                      }}
                      size="sm"
                    >
                      Enforce
                    </Button>
                  ) : null}
                  <Button aria-label={`History of ${policy.name}`} icon={History} onClick={() => setHistory(policy)} size="icon-sm" title="Versions and rollback" variant="ghost" />
                  <Button
                    aria-label={`Edit ${policy.name}`}
                    icon={Pencil}
                    onClick={() => setEditing({ id: policy.id, draft: { ...policy, description: policy.description ?? '' } })}
                    size="icon-sm"
                    variant="ghost"
                  />
                  <Button
                    aria-label={`Delete ${policy.name}`}
                    icon={Trash2}
                    onClick={async () => {
                      const ok = await confirm({ title: 'Delete policy?', message: `"${policy.name}" stops applying immediately.`, confirmText: 'Delete', type: 'danger' });
                      if (!ok) return;
                      try {
                        await changed(await agentsApi.deletePolicy(policy.id), 'Policy deleted');
                      } catch (error) {
                        showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                      }
                    }}
                    size="icon-sm"
                    variant="ghost"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {unused.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {unused.map((template) => (
            <button
              className="card-hover rounded-xl border border-dashed border-slate-300 bg-white p-3.5 text-left"
              key={template.id}
              onClick={() =>
                setEditing({
                  id: null,
                  draft: { name: template.name, description: template.description, effect: template.effect, mode: template.mode, priority: template.priority, enabled: true, match: template.match }
                })
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-slate-900">{template.name}</span>
                <EffectBadge effect={template.effect} />
              </div>
              <p className="m-0 mt-1 text-xs leading-relaxed text-slate-500">{template.description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <Plus className="h-3 w-3" /> Use template
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <DryRun catalog={catalog} workspaceId={workspaceId} />

      {editing ? (
        <PolicyEditor
          catalog={catalog}
          initial={editing.draft}
          onClose={() => setEditing(null)}
          onSave={save}
          policyId={editing.id}
          projects={projects}
          workspaceId={workspaceId}
        />
      ) : null}
      {history ? <PolicyHistoryModal onClose={() => setHistory(null)} onRolledBack={() => void load()} policy={history} /> : null}
    </div>
  );
}
