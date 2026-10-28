import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  Bot,
  CalendarCheck,
  CircleDollarSign,
  EyeOff,
  FileCheck2,
  Gauge,
  History,
  Inbox,
  KeyRound,
  OctagonX,
  ScrollText,
  Search,
  ShieldCheck,
  ShieldHalf
} from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card, CardHeader, StatCard, Tabs, cn, inputClass, selectClass } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { ActivityLog } from '@/features/agents/components/ActivityLog';
import { AgentDrawer } from '@/features/agents/components/AgentDrawer';
import { ApprovalsInbox } from '@/features/agents/components/ApprovalsInbox';
import { CompliancePanel } from '@/features/agents/components/CompliancePanel';
import { CostsPanel } from '@/features/agents/components/CostsPanel';
import { CreateKeyModal } from '@/features/agents/components/CreateKeyModal';
import { PoliciesPanel } from '@/features/agents/components/PoliciesPanel';
import { KindLabel, RiskBadge, StatusBadge } from '@/features/agents/components/shared';
import { isAtLeastAdmin, useWorkspace } from '@/features/workspaces';
import {
  agentsApi,
  KIND_LABELS,
  timeAgo,
  userLabel,
  type Agent,
  type AgentAlert,
  type AgentKind,
  type AgentOverview
} from '@/services/agents';
import type { Project } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';

export type AgentsTab = 'overview' | 'inventory' | 'approvals' | 'policies' | 'activity' | 'costs' | 'compliance';
const TABS: AgentsTab[] = ['overview', 'inventory', 'approvals', 'policies', 'activity', 'costs', 'compliance'];

const SEVERITY_TONE = { info: 'info', warning: 'warning', critical: 'danger' } as const;

function AlertsCard({ alerts, onAcknowledge }: { alerts: AgentAlert[]; onAcknowledge: (id: string) => void }): JSX.Element {
  return (
    <Card>
      <CardHeader description="Unusual behaviour and blocked actions." icon={<BellRing className="h-4 w-4 text-slate-400" />} title="Open alerts" />
      {alerts.length === 0 ? (
        <p className="m-0 p-4 text-[13px] text-slate-500">Nothing needs attention.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {alerts.slice(0, 8).map((alert) => (
            <li className="flex items-start justify-between gap-3 px-4 py-3" data-testid="alert-row" key={alert.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge dot tone={SEVERITY_TONE[alert.severity]}>
                    {alert.severity}
                  </Badge>
                  <span className="text-[13px] font-medium text-slate-900">{alert.title}</span>
                </div>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {alert.detail} · {timeAgo(alert.createdAt)}
                </p>
              </div>
              <Button onClick={() => onAcknowledge(alert.id)} size="sm" variant="ghost">
                Dismiss
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Scripts and automated browsers found using a person's login: the shadow AI to act on. */
function UnregisteredCard({ agents, onOpen }: { agents: Agent[]; onOpen: (agent: Agent) => void }): JSX.Element | null {
  const open = agents.filter((agent) => agent.kind === 'detected' && agent.status !== 'revoked');
  if (open.length === 0) return null;
  return (
    <Card className="border-amber-200" data-testid="unregistered-card">
      <CardHeader
        description="Scripts and automated browsers using a person's own login. Give each its own key, or block it."
        icon={<EyeOff className="h-4 w-4 text-amber-500" />}
        title={`Unregistered agents (${open.length})`}
      />
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {open.slice(0, 6).map((agent) => (
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={agent.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-slate-900">{agent.name}</span>
                <StatusBadge status={agent.status} />
                <RiskBadge level={agent.riskLevel} score={agent.riskScore} />
              </div>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                Uses {userLabel(agent.ownerUserId)}&apos;s login · {agent.callCount.toLocaleString()} calls · last seen {timeAgo(agent.lastSeenAt)}
              </p>
            </div>
            <Button onClick={() => onOpen(agent)} size="sm">
              Review
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Agents whose access nobody has confirmed for 90 days. */
function ReviewsCard({
  agents,
  onOpen,
  onConfirm
}: {
  agents: Agent[];
  onOpen: (agent: Agent) => void;
  onConfirm: (agent: Agent) => Promise<void>;
}): JSX.Element | null {
  const [busy, setBusy] = useState<string | null>(null);
  const due = agents.filter((agent) => agent.reviewDue && agent.status !== 'revoked' && agent.kind !== 'detected');
  if (due.length === 0) return null;
  return (
    <Card data-testid="reviews-card">
      <CardHeader
        description="Confirm each agent still needs its access, or suspend it. Reviews are due every 90 days."
        icon={<CalendarCheck className="h-4 w-4 text-slate-400" />}
        title={`Access reviews due (${due.length})`}
      />
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {due.slice(0, 8).map((agent) => (
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid="review-row" key={agent.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-slate-900">{agent.name}</span>
                <KindLabel kind={agent.kind} />
                <StatusBadge status={agent.status} />
              </div>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                {userLabel(agent.ownerUserId)} · last active {timeAgo(agent.lastSeenAt)} · {agent.reviewedAt ? `confirmed ${timeAgo(agent.reviewedAt)}` : 'never confirmed'}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button
                loading={busy === agent.id}
                onClick={async () => {
                  setBusy(agent.id);
                  try {
                    await onConfirm(agent);
                  } finally {
                    setBusy(null);
                  }
                }}
                size="sm"
                variant="primary"
              >
                Still needed
              </Button>
              <Button onClick={() => onOpen(agent)} size="sm">
                Review
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function InventoryTable({
  agents,
  onOpen
}: {
  agents: Agent[];
  onOpen: (agent: Agent) => void;
}): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Agent</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Owner</th>
            <th className="px-3 py-2 font-medium">Access</th>
            <th className="px-3 py-2 font-medium">Risk</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Last active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {agents.map((agent) => (
            <tr className="cursor-pointer hover:bg-slate-50/70" data-testid="agent-row" key={agent.id} onClick={() => onOpen(agent)}>
              <td className="px-4 py-2.5">
                <button className="text-left font-medium text-slate-900 hover:text-emerald-700" type="button">
                  {agent.name}
                </button>
                {agent.legacy ? (
                  <Badge className="ml-2" tone="orange">
                    Legacy
                  </Badge>
                ) : null}
                {agent.kind === 'detected' ? (
                  <Badge className="ml-2" tone="warning">
                    Uses a personal login
                  </Badge>
                ) : null}
                {agent.keyPrefix ? <div className="font-mono text-xs text-slate-400">{agent.keyPrefix}…</div> : null}
              </td>
              <td className="px-3 py-2.5">
                <KindLabel kind={agent.kind} />
              </td>
              <td className="px-3 py-2.5 text-slate-600">{userLabel(agent.ownerUserId)}</td>
              <td className="px-3 py-2.5 text-xs text-slate-600">
                {agent.scopes.includes('workspace:admin') ? 'Admin' : agent.scopes.some((s) => s.endsWith(':write') || s === 'ai:execute') ? 'Read and write' : 'Read only'}
                <div className="text-slate-400">{agent.projectIds.length ? `${agent.projectIds.length} project(s)` : 'All projects'}</div>
              </td>
              <td className="px-3 py-2.5">
                <RiskBadge level={agent.riskLevel} score={agent.riskScore} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={agent.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{timeAgo(agent.lastSeenAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AgentsPageProps {
  projects: Project[];
}

export default function AgentsPage({ projects }: AgentsPageProps): JSX.Element {
  const params = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: AgentsTab = TABS.includes(params.tab as AgentsTab) ? (params.tab as AgentsTab) : 'overview';
  const { activeWorkspace } = useWorkspace();
  const canAdmin = activeWorkspace ? isAtLeastAdmin(activeWorkspace.role) : false;
  const workspaceId = canAdmin ? activeWorkspace?.id ?? null : null;
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [overview, setOverview] = useState<AgentOverview | null>(null);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<AgentKind | ''>('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const closeDrawer = useCallback(() => setOpenAgent(null), []);

  const refresh = useCallback(async () => {
    try {
      const [nextOverview, nextAgents, nextAlerts] = await Promise.all([
        agentsApi.overview(workspaceId),
        agentsApi.list({ workspaceId: activeWorkspace?.id ?? null }),
        agentsApi.alerts({ open: true })
      ]);
      setOverview(nextOverview);
      setAgents(nextAgents);
      setAlerts(nextAlerts);
    } catch (error) {
      setAgents((current) => current ?? []);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  }, [workspaceId, activeWorkspace?.id, showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = useMemo(
    () =>
      (agents ?? []).filter(
        (agent) =>
          (!kind || agent.kind === kind) &&
          (!status || agent.status === status) &&
          (!query || agent.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [agents, kind, status, query]
  );

  const stats = overview?.stats;
  const activeCount = stats?.agents.active ?? (agents ?? []).filter((a) => a.status === 'active').length;
  const highRisk = (stats?.risk.high ?? 0) + (stats?.risk.critical ?? 0);
  const pending = overview?.pendingApprovals ?? 0;
  const blocked24h = stats?.activity24h.blocked ?? 0;
  const actions24h = Object.values(stats?.activity24h ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);

  const killSwitch = async () => {
    const ok = await confirm({
      title: 'Stop all agents?',
      message: 'Every active agent in this workspace is suspended at once: API keys, MCP clients, ChatGPT, companions and AI providers. Resume them one by one afterwards.',
      confirmText: 'Stop all agents',
      type: 'danger'
    });
    if (!ok) return;
    try {
      const result = await agentsApi.killSwitch(workspaceId, 'Emergency stop from the portal');
      showToast({ variant: 'success', message: `${result.suspended} agent(s) suspended` });
      await refresh();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader
        actions={
          <>
            {canAdmin ? (
              <Button icon={OctagonX} onClick={() => void killSwitch()} size="sm" variant="danger">
                Stop all agents
              </Button>
            ) : null}
            <Button icon={KeyRound} onClick={() => setCreating(true)} size="sm" variant="primary">
              New agent key
            </Button>
          </>
        }
        description="See every AI agent and integration acting in your workspace, control what it can do and keep a record."
        icon={ShieldHalf}
        title="Agent Governance"
        tone="violet"
      >
        <Tabs
          items={[
            { value: 'overview', label: 'Overview', icon: Gauge },
            { value: 'inventory', label: 'Agents', icon: Bot, count: agents?.filter((a) => a.status !== 'revoked').length },
            { value: 'approvals', label: 'Approvals', icon: Inbox, count: pending || undefined },
            { value: 'policies', label: 'Policies', icon: ScrollText },
            { value: 'activity', label: 'Activity', icon: History },
            { value: 'costs', label: 'Costs', icon: CircleDollarSign },
            { value: 'compliance', label: 'Compliance', icon: FileCheck2 }
          ]}
          onChange={(next) => navigate(next === 'overview' ? '/agents' : `/agents/${next}`)}
          value={tab}
        />
      </PageHeader>

      <div className="space-y-4 px-3 py-4 sm:px-5 lg:px-6">
        {tab === 'overview' ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard hint={`${agents?.length ?? 0} known in total`} icon={Bot} label="Active agents" onClick={() => navigate('/agents/inventory')} tone="violet" value={activeCount} />
              <StatCard
                hint={highRisk ? 'Review their risk factors' : 'No high-risk agents'}
                hintTone={highRisk ? 'danger' : 'success'}
                icon={AlertTriangle}
                label="High risk"
                onClick={() => navigate('/agents/inventory')}
                tone="rose"
                value={highRisk}
              />
              <StatCard
                hint={pending ? 'Waiting for a decision' : 'Inbox clear'}
                hintTone={pending ? 'warning' : 'neutral'}
                icon={Inbox}
                label="Approvals"
                onClick={() => navigate('/agents/approvals')}
                tone="amber"
                value={pending}
              />
              <StatCard
                hint={`${blocked24h} blocked`}
                hintTone={blocked24h ? 'warning' : 'neutral'}
                icon={History}
                label="Actions, last 24h"
                onClick={() => navigate('/agents/activity')}
                tone="sky"
                value={actions24h}
              />
            </div>

            <UnregisteredCard agents={agents ?? []} onOpen={(agent) => setOpenAgent(agent.id)} />
            <ReviewsCard
              agents={agents ?? []}
              onConfirm={async (agent) => {
                try {
                  const updated = await agentsApi.review(agent.id);
                  setAgents((current) => current?.map((a) => (a.id === agent.id ? { ...a, ...updated, ownerUserId: a.ownerUserId } : a)) ?? current);
                  showToast({ variant: 'success', message: `${agent.name} confirmed for another 90 days` });
                } catch (error) {
                  showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                }
              }}
              onOpen={(agent) => setOpenAgent(agent.id)}
            />

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <AlertsCard
                alerts={alerts}
                onAcknowledge={async (id) => {
                  try {
                    await agentsApi.acknowledgeAlert(id);
                    setAlerts((current) => current.filter((a) => a.id !== id));
                  } catch (error) {
                    showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                  }
                }}
              />
              <Card>
                <CardHeader description="Where agents come from." icon={<ShieldCheck className="h-4 w-4 text-slate-400" />} title="Inventory" />
                <ul className="m-0 list-none space-y-2 p-4">
                  {(Object.keys(KIND_LABELS) as AgentKind[]).map((k) => {
                    const count = (agents ?? []).filter((a) => a.kind === k && a.status !== 'revoked').length;
                    return (
                      <li className="flex items-center justify-between" key={k}>
                        <KindLabel kind={k} />
                        <span className="text-[13px] font-semibold tabular-nums text-slate-900">{count}</span>
                      </li>
                    );
                  })}
                </ul>
                {!canAdmin ? (
                  <p className="m-0 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                    You see your own agents. Workspace admins see everyone&apos;s.
                  </p>
                ) : null}
              </Card>
            </div>

            {agents && agents.some((a) => a.riskLevel === 'high' || a.riskLevel === 'critical') ? (
              <Card>
                <CardHeader description="Open one to see why and fix it." icon={<AlertTriangle className="h-4 w-4 text-slate-400" />} title="Highest risk" />
                <InventoryTable
                  agents={agents.filter((a) => a.status !== 'revoked').sort((a, b) => b.riskScore - a.riskScore).slice(0, 5)}
                  onOpen={(agent) => setOpenAgent(agent.id)}
                />
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === 'inventory' ? (
          <Card>
            <div className="grid gap-2 border-b border-slate-100 p-3 sm:flex sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input aria-label="Search agents" className={cn(inputClass, 'h-8 pl-8')} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents" value={query} />
              </div>
              <select aria-label="Type" className={cn(selectClass, 'h-8 sm:w-44')} onChange={(e) => setKind(e.target.value as AgentKind | '')} value={kind}>
                <option value="">All types</option>
                {(Object.keys(KIND_LABELS) as AgentKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <select aria-label="Status" className={cn(selectClass, 'h-8 sm:w-48')} onChange={(e) => setStatus(e.target.value)} value={status}>
                <option value="">Active and suspended</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            {agents == null ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div className="h-11 animate-pulse rounded-lg bg-slate-100" key={i} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  action={
                    <Button icon={KeyRound} onClick={() => setCreating(true)} size="sm" variant="primary">
                      New agent key
                    </Button>
                  }
                  compact
                  description="Agents appear when an API key, MCP client, ChatGPT, a companion device or an AI provider is used."
                  icon={Bot}
                  title="No agents found"
                />
              </div>
            ) : (
              <InventoryTable agents={visible} onOpen={(agent) => setOpenAgent(agent.id)} />
            )}
          </Card>
        ) : null}

        {tab === 'approvals' ? <ApprovalsInbox onChanged={() => void refresh()} /> : null}
        {tab === 'policies' ? <PoliciesPanel canAdmin={canAdmin} projects={projects} workspaceId={workspaceId} /> : null}
        {tab === 'activity' ? <ActivityLog canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
        {tab === 'costs' ? <CostsPanel canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
        {tab === 'compliance' ? <CompliancePanel canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
      </div>

      {openAgent ? (
        <AgentDrawer agentId={openAgent} canAdmin={canAdmin} onChanged={() => void refresh()} onClose={closeDrawer} projects={projects} />
      ) : null}
      {creating ? (
        <CreateKeyModal
          canAdmin={canAdmin}
          onClose={() => setCreating(false)}
          onCreated={() => void refresh()}
          projects={projects}
          workspaceId={activeWorkspace?.id ?? null}
        />
      ) : null}
    </div>
  );
}
