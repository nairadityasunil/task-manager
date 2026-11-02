import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  Bot,
  Building2,
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
  ShieldHalf,
  Webhook
} from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card, CardHeader, Tabs, cn, inputClass, selectClass, Select } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { ActivityLog } from '@/features/agents/components/ActivityLog';
import { AgentDrawer } from '@/features/agents/components/AgentDrawer';
import { ApprovalsInbox } from '@/features/agents/components/ApprovalsInbox';
import { CompliancePanel } from '@/features/agents/components/CompliancePanel';
import { CostsPanel } from '@/features/agents/components/CostsPanel';
import { NotificationsPanel } from '@/features/agents/components/NotificationsPanel';
import { CreateKeyModal } from '@/features/agents/components/CreateKeyModal';
import { PoliciesPanel } from '@/features/agents/components/PoliciesPanel';
import { VendorDrawer } from '@/features/agents/components/VendorDrawer';
import { VendorsPanel } from '@/features/agents/components/VendorsPanel';
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
import { vendorsApi, type VendorListItem } from '@/services/vendors';
import type { Project } from '@/types/project';
import { isAgentForbidden, toDisplayErrorMessage } from '@/utils/apiError';

export type AgentsTab = 'overview' | 'inventory' | 'vendors' | 'approvals' | 'policies' | 'activity' | 'costs' | 'notifications' | 'compliance';
const TABS: AgentsTab[] = ['overview', 'inventory', 'vendors', 'approvals', 'policies', 'activity', 'costs', 'notifications', 'compliance'];

const SEVERITY_TONE = { info: 'info', warning: 'warning', critical: 'danger' } as const;

function AlertsCard({
  alerts,
  onAcknowledge,
  onOpenVendor
}: {
  alerts: AgentAlert[];
  onAcknowledge: (id: string) => void;
  onOpenVendor: (vendorId: string) => void;
}): JSX.Element {
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
              <div className="flex shrink-0 gap-1">
                {alert.vendorId ? (
                  <Button onClick={() => onOpenVendor(typeof alert.vendorId === 'object' && alert.vendorId ? alert.vendorId._id : String(alert.vendorId))} size="sm">
                    Open vendor
                  </Button>
                ) : null}
                <Button onClick={() => onAcknowledge(alert.id)} size="sm" variant="ghost">
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Shown when this session is an automated browser: governance is for people only. */
function AgentSessionNotice(): JSX.Element {
  return (
    <Card className="border-amber-200" data-testid="agent-session-notice">
      <CardHeader
        description="This browser identifies itself as automated (for example headless Chrome, Playwright or Selenium), so it is treated as an agent using your login."
        icon={<EyeOff className="h-4 w-4 text-amber-500" />}
        title="Agent Governance is for people"
      />
      <div className="space-y-2 p-4 text-[13px] text-slate-600">
        <p className="m-0">
          Agents cannot see or change agent governance, sign-in or credentials, so an agent cannot approve or unblock itself. The rest of the
          workspace works as usual, under your agent policies.
        </p>
        <ul className="m-0 list-disc space-y-1 pl-5">
          <li>Open this page in your normal browser to manage agents, vendors and policies.</li>
          <li>For automated access, give the tool its own agent key under Agent Governance instead of your login.</li>
          <li>This session is listed under Agents as an unregistered agent, where an admin can review or block it.</li>
        </ul>
      </div>
    </Card>
  );
}

const SEVERITY_LABEL: Record<'critical' | 'high' | 'review' | 'routine', { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700' },
  high: { label: 'High', className: 'bg-orange-50 text-orange-800' },
  review: { label: 'Review', className: 'bg-amber-50 text-amber-800' },
  routine: { label: 'Routine', className: 'bg-slate-100 text-slate-700' }
};

function AttentionRow({
  severity,
  title,
  detail,
  children,
  testId
}: {
  severity: keyof typeof SEVERITY_LABEL;
  title: React.ReactNode;
  detail: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}): JSX.Element {
  const meta = SEVERITY_LABEL[severity];
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0" data-testid={testId}>
      <span className={cn('inline-flex h-5 w-[62px] shrink-0 items-center justify-center rounded text-[11px] font-medium', meta.className)}>{meta.label}</span>
      <div className="min-w-[220px] flex-1">
        <div className="text-[13px] font-medium text-slate-900">{title}</div>
        <div className="text-[13px] text-slate-600">{detail}</div>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  );
}

/**
 * Everything that needs a decision, most important first: scripts using a
 * person's login, vendors waiting for review, and agents due their access check.
 */
function NeedsAttention({
  agents,
  vendors,
  onOpenAgent,
  onOpenVendor,
  onBlock,
  onConfirm
}: {
  agents: Agent[];
  vendors: VendorListItem[];
  onOpenAgent: (agent: Agent) => void;
  onOpenVendor: (vendorId: string) => void;
  onBlock: (agent: Agent) => Promise<void>;
  onConfirm: (agent: Agent) => Promise<void>;
}): JSX.Element {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  const unregistered = agents.filter((agent) => agent.kind === 'detected' && agent.status !== 'revoked');
  const vendorQueue = vendors.filter((vendor) => vendor.status === 'under_review' || vendor.reviewDue);
  const reviews = agents.filter((agent) => agent.reviewDue && agent.status !== 'revoked' && agent.kind !== 'detected');
  const total = unregistered.length + vendorQueue.length + reviews.length;

  return (
    <section aria-labelledby="attention-title">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="m-0 text-sm font-semibold text-slate-900" id="attention-title">
          Needs attention
        </h2>
        <span className="font-mono text-xs text-slate-500">{total}</span>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        {total === 0 ? <p className="m-0 px-4 py-4 text-[13px] text-slate-600">Nothing needs attention.</p> : null}
        {unregistered.length ? (
          <ul className="m-0 list-none border-b border-slate-100 p-0 last:border-b-0" data-testid="unregistered-card">
            {unregistered.slice(0, 6).map((agent) => (
              <AttentionRow
                detail={
                  <>
                    <span className="font-mono text-xs">{agent.userAgent?.split(' ')[0] || agent.name}</span> · {agent.callCount.toLocaleString()} calls · last seen{' '}
                    {timeAgo(agent.lastSeenAt)}
                  </>
                }
                key={agent.id}
                severity={agent.riskLevel === 'critical' ? 'critical' : 'high'}
                title={`${agent.name} is using ${userLabel(agent.ownerUserId)}’s login`}
              >
                <Button disabled={busy === agent.id || agent.status !== 'active'} onClick={() => void run(agent.id, () => onBlock(agent))} size="sm">
                  {agent.status === 'active' ? 'Block' : 'Blocked'}
                </Button>
                <Button onClick={() => onOpenAgent(agent)} size="sm" variant="dark">
                  Review
                </Button>
              </AttentionRow>
            ))}
          </ul>
        ) : null}
        {vendorQueue.length ? (
          <ul className="m-0 list-none border-b border-slate-100 p-0 last:border-b-0" data-testid="vendor-review-card">
            {vendorQueue.slice(0, 6).map((vendor) => (
              <AttentionRow
                detail={`${vendor.agentCount} agent(s) · residual risk ${vendor.residualRisk} · found ${timeAgo(vendor.firstSeenAt)}`}
                key={vendor.id}
                severity={vendor.riskLevel === 'critical' ? 'critical' : 'review'}
                title={vendor.reviewDue && vendor.status !== 'under_review' ? `${vendor.name} is due its reassessment` : `${vendor.name} is new and not reviewed yet`}
              >
                <Button onClick={() => onOpenVendor(vendor.id)} size="sm" variant="dark">
                  Review
                </Button>
              </AttentionRow>
            ))}
          </ul>
        ) : null}
        {reviews.length ? (
          <ul className="m-0 list-none p-0" data-testid="reviews-card">
            {reviews.slice(0, 8).map((agent) => (
              <AttentionRow
                detail={`${userLabel(agent.ownerUserId)} · last active ${timeAgo(agent.lastSeenAt)} · ${agent.reviewedAt ? `confirmed ${timeAgo(agent.reviewedAt)}` : 'never confirmed'}`}
                key={agent.id}
                severity="routine"
                testId="review-row"
                title={`${agent.name} is due its 90-day access check`}
              >
                <Button onClick={() => onOpenAgent(agent)} size="sm">
                  Review
                </Button>
                <Button loading={busy === agent.id} onClick={() => void run(agent.id, () => onConfirm(agent))} size="sm" variant="dark">
                  Still needed
                </Button>
              </AttentionRow>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function InventoryTable({
  agents,
  vendorNames,
  onOpen
}: {
  agents: Agent[];
  vendorNames: Map<string, string>;
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
                {agent.vendorId && vendorNames.get(agent.vendorId) ? (
                  <div className="text-xs text-slate-400" data-testid="agent-vendor">
                    {vendorNames.get(agent.vendorId)}
                  </div>
                ) : null}
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
  /** null until the first load: whether this session is an automated agent (governance refused). */
  const [agentSession, setAgentSession] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorListItem[] | null>(null);
  const [openVendor, setOpenVendor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<AgentKind | ''>('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const closeDrawer = useCallback(() => setOpenAgent(null), []);
  const closeVendor = useCallback(() => setOpenVendor(null), []);

  const refreshVendors = useCallback(async () => {
    if (!canAdmin) return;
    try {
      setVendors(await vendorsApi.list(workspaceId));
    } catch (error) {
      if (isAgentForbidden(error)) return;
      setVendors((current) => current ?? []);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  }, [canAdmin, workspaceId, showToast]);

  useEffect(() => {
    void refreshVendors();
  }, [refreshVendors]);

  const vendorNames = useMemo(() => new Map((vendors ?? []).map((v) => [v.id, v.name])), [vendors]);

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
      setAgentSession(false);
    } catch (error) {
      if (isAgentForbidden(error)) {
        setAgentSession(true);
        return;
      }
      setAgentSession(false);
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

  /** Nine pages in five groups; every page keeps its own address. */
  const groups: Array<{ id: string; label: string; count?: number; pages: Array<{ value: AgentsTab; label: string; icon: typeof Gauge; count?: number }> }> = [
    { id: 'overview', label: 'Overview', pages: [{ value: 'overview', label: 'Overview', icon: Gauge }] },
    {
      id: 'agents',
      label: 'Agents & vendors',
      count: agents?.filter((a) => a.status !== 'revoked').length,
      pages: [
        { value: 'inventory', label: 'Agents', icon: Bot, count: agents?.filter((a) => a.status !== 'revoked').length },
        ...(canAdmin
          ? [{ value: 'vendors' as const, label: 'Vendors', icon: Building2, count: vendors?.filter((v) => v.status === 'under_review').length || undefined }]
          : [])
      ]
    },
    {
      id: 'rules',
      label: 'Rules & approvals',
      count: pending || undefined,
      pages: [
        { value: 'policies', label: 'Policies', icon: ScrollText },
        { value: 'approvals', label: 'Approvals', icon: Inbox, count: pending || undefined }
      ]
    },
    { id: 'activity', label: 'Activity', pages: [{ value: 'activity', label: 'Activity', icon: History }] },
    {
      id: 'settings',
      label: 'Settings',
      pages: [
        { value: 'costs', label: 'Costs', icon: CircleDollarSign },
        { value: 'notifications', label: 'Notifications', icon: Webhook },
        { value: 'compliance', label: 'Compliance', icon: FileCheck2 }
      ]
    }
  ];
  const activeGroup = groups.find((group) => group.pages.some((page) => page.value === tab)) ?? groups[0];

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
          agentSession ? null : (
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
          )
        }
        description="See every AI agent and integration acting in your workspace, control what it can do and keep a record."
        icon={ShieldHalf}
        title="Agent Governance"
        tone="violet"
      >
        <Tabs
          items={groups.map((group) => ({ value: group.id, label: group.label, count: group.count }))}
          onChange={(next) => {
            const first = groups.find((group) => group.id === next)?.pages[0].value ?? 'overview';
            navigate(first === 'overview' ? '/agents' : `/agents/${first}`);
          }}
          value={activeGroup.id}
        />
      </PageHeader>
      {activeGroup.pages.length > 1 ? (
        <div className="border-b border-slate-200 bg-white px-3 py-2 sm:px-5 lg:px-6">
          <div aria-label={activeGroup.label} className="inline-flex gap-0.5 rounded-md bg-slate-100 p-0.5" role="tablist">
            {activeGroup.pages.map((page) => (
              <button
                aria-selected={tab === page.value}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium transition-colors',
                  tab === page.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
                key={page.value}
                onClick={() => navigate(`/agents/${page.value}`)}
                role="tab"
                type="button"
              >
                <page.icon aria-hidden size={14} />
                {page.label}
                {page.count ? <span className="rounded bg-slate-200 px-1.5 font-mono text-[11px] text-slate-700">{page.count}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4 px-3 py-4 sm:px-5 lg:px-6">
        {agentSession ? <AgentSessionNotice /> : null}
        {agentSession === null && tab !== 'overview' && tab !== 'inventory' ? <div className="h-64 animate-pulse rounded-xl bg-slate-100" /> : null}
        {agentSession === false || (agentSession === null && (tab === 'overview' || tab === 'inventory')) ? (
        <>
        {tab === 'overview' ? (
          <>
            <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-slate-200 bg-white lg:grid-cols-4" data-testid="governance-stats">
              {[
                { label: 'Active agents', value: activeCount, hint: `${agents?.length ?? 0} known in total`, tone: 'text-slate-500', to: '/agents/inventory' },
                { label: 'High risk', value: highRisk, hint: highRisk ? 'Review their risk factors' : 'No high-risk agents', tone: highRisk ? 'text-red-700' : 'text-slate-500', to: '/agents/inventory' },
                { label: 'Approvals', value: pending, hint: pending ? 'Waiting for a decision' : 'Inbox clear', tone: pending ? 'text-amber-700' : 'text-slate-500', to: '/agents/approvals' },
                { label: 'Actions, last 24h', value: actions24h, hint: `${blocked24h} blocked`, tone: blocked24h ? 'text-amber-700' : 'text-slate-500', to: '/agents/activity' }
              ].map((item, index) => (
                <button
                  className={cn(
                    'px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none',
                    index % 2 === 0 && 'border-r border-slate-100',
                    index < 2 && 'border-b border-slate-100 lg:border-b-0',
                    index === 1 && 'lg:border-r'
                  )}
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  type="button"
                >
                  <span className="block text-[13px] text-slate-600">{item.label}</span>
                  <span className="mt-1 block text-[22px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">{item.value}</span>
                  <span className={cn('mt-0.5 block truncate text-xs', item.tone)}>{item.hint}</span>
                </button>
              ))}
            </div>

            <NeedsAttention
              agents={agents ?? []}
              onBlock={async (agent) => {
                try {
                  await agentsApi.suspend(agent.id, 'Blocked from using a personal login');
                  showToast({ variant: 'success', message: `${agent.name} blocked` });
                  await refresh();
                } catch (error) {
                  showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                }
              }}
              onConfirm={async (agent) => {
                try {
                  const updated = await agentsApi.review(agent.id);
                  setAgents((current) => current?.map((a) => (a.id === agent.id ? { ...a, ...updated, ownerUserId: a.ownerUserId } : a)) ?? current);
                  showToast({ variant: 'success', message: `${agent.name} confirmed for another 90 days` });
                } catch (error) {
                  showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                }
              }}
              onOpenAgent={(agent) => setOpenAgent(agent.id)}
              onOpenVendor={setOpenVendor}
              vendors={vendors ?? []}
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
                onOpenVendor={setOpenVendor}
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
                  vendorNames={vendorNames}
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
              <Select aria-label="Type" className={cn(selectClass, 'h-8 sm:w-44')} onChange={(e) => setKind(e.target.value as AgentKind | '')} value={kind}>
                <option value="">All types</option>
                {(Object.keys(KIND_LABELS) as AgentKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
              <Select aria-label="Status" className={cn(selectClass, 'h-8 sm:w-48')} onChange={(e) => setStatus(e.target.value)} value={status}>
                <option value="">Active and suspended</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
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
              <InventoryTable agents={visible} onOpen={(agent) => setOpenAgent(agent.id)} vendorNames={vendorNames} />
            )}
          </Card>
        ) : null}

        {tab === 'vendors' ? (
          <VendorsPanel canAdmin={canAdmin} onChanged={() => void refreshVendors()} onOpen={setOpenVendor} vendors={vendors} workspaceId={workspaceId} />
        ) : null}
        {tab === 'approvals' ? <ApprovalsInbox onChanged={() => void refresh()} /> : null}
        {tab === 'policies' ? <PoliciesPanel canAdmin={canAdmin} projects={projects} workspaceId={workspaceId} /> : null}
        {tab === 'activity' ? <ActivityLog canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
        {tab === 'costs' ? <CostsPanel canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
        {tab === 'notifications' ? <NotificationsPanel canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
        {tab === 'compliance' ? <CompliancePanel canAdmin={canAdmin} workspaceId={workspaceId} /> : null}
        </>
        ) : null}
      </div>

      {openAgent ? (
        <AgentDrawer agentId={openAgent} canAdmin={canAdmin} onChanged={() => void refresh()} onClose={closeDrawer} projects={projects} />
      ) : null}
      {openVendor ? (
        <VendorDrawer
          onChanged={() => {
            void refreshVendors();
            void refresh();
          }}
          onClose={closeVendor}
          vendorId={openVendor}
          workspaceId={workspaceId}
        />
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
