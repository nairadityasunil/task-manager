import api from '@/services/api';

export type AgentKind = 'api_key' | 'mcp_client' | 'chatgpt' | 'companion' | 'ai_provider' | 'detected';
export type AgentStatus = 'active' | 'suspended' | 'revoked';
export type AgentRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'read' | 'write' | 'sensitive_write' | 'destructive' | 'security_critical';
export type PolicyEffect = 'allow' | 'deny' | 'require_approval';
/** 'simulation': a draft that is never enforced, only replayed against recent activity. */
export type PolicyMode = 'enforce' | 'advisory' | 'simulation';
export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed' | 'failed';
export type ActivityOutcome = 'allowed' | 'blocked' | 'pending_approval' | 'error';

export interface RiskFactor {
  code: string;
  label: string;
  weight: number;
  frameworks: string[];
}

export interface UserRef {
  _id: string;
  name?: string | null;
  email?: string;
}

export interface Agent {
  id: string;
  workspaceId: string | null;
  ownerUserId: string | UserRef;
  kind: AgentKind;
  name: string;
  clientName?: string | null;
  userAgent?: string | null;
  /** Why an unregistered ("detected") agent was judged automated. */
  detectionSignals?: string[];
  replacedByAgentId?: string | null;
  /** The third party behind it (see the vendor register). */
  vendorId?: string | null;
  keyPrefix?: string | null;
  scopes: string[];
  projectIds: string[];
  status: AgentStatus;
  legacy: boolean;
  statusReason?: string | null;
  /** Suspended by a workspace admin: only an admin can resume it. */
  statusSetByAdmin?: boolean;
  /** An admin reduced its access: the owner can only reduce it further. */
  adminLocked?: boolean;
  expiresAt?: string | null;
  /** Calls allowed per minute; null for no limit. */
  rateLimitPerMinute?: number | null;
  lastSeenAt?: string | null;
  /** Last time its owner or an admin confirmed it is still needed. */
  reviewedAt?: string | null;
  reviewDueAt?: string | null;
  reviewDue?: boolean;
  callCount: number;
  riskScore: number;
  riskLevel: AgentRiskLevel;
  riskFactors: RiskFactor[];
  riskEvaluatedAt?: string | null;
  createdAt: string;
  /** Suspended automatically (critical risk, threat or incident); the owner or an admin can resume it. */
  suspendedBySystem?: boolean;
  /** After an incident: the next change needs a person's approval. */
  reapprovalRequired?: boolean;
  /** "vendor": the key is used by a third party (stricter rules). */
  operatedBy?: 'internal' | 'vendor';
  keyIssuedAt?: string | null;
  /** The key before the last rotation keeps working until then. */
  previousKeyExpiresAt?: string | null;
  /** A key the system rotated is waiting for its owner to collect (once). */
  hasPendingKey?: boolean;
  pendingKeyIssuedAt?: string | null;
  knownIps?: Array<{ ip: string; country?: string | null; firstSeen: string; lastSeen: string }>;
}

export interface AgentUsage {
  outcomes: Partial<Record<ActivityOutcome, number>>;
  daily: Array<{ date: string; calls: number }>;
  ai: { calls: number; tokens: number; cost: number; errors: number } | null;
}

export interface AgentDetail extends Agent {
  usage: AgentUsage;
}

export interface AgentOverview {
  workspaceId: string | null;
  isAdmin: boolean;
  stats: {
    agents: Partial<Record<AgentStatus, number>>;
    kinds: Partial<Record<AgentKind, number>>;
    risk: Partial<Record<AgentRiskLevel, number>>;
    activity24h: Partial<Record<ActivityOutcome, number>>;
    openAlerts: number;
    pendingApprovals: number;
  } | null;
  pendingApprovals: number;
  myAgents: number;
  /** Set when the viewer is an agent: its changes here are held for a person. */
  viewerAgent?: { id: string; name: string; kind: AgentKind } | null;
}

export interface PolicyMatch {
  agentKinds?: AgentKind[];
  agentIds?: string[];
  tools?: string[];
  domains?: string[];
  minRisk?: RiskLevel;
  projectIds?: string[];
  classifications?: Classification[];
  operatedBy?: Array<'internal' | 'vendor'>;
  timeWindow?: {
    days?: number[];
    startHour?: number;
    endHour?: number;
    timezone?: string;
    outside?: boolean;
  };
}

export interface AgentPolicy {
  id: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  mode: PolicyMode;
  priority: number;
  enabled: boolean;
  match: PolicyMatch;
  createdAt?: string;
  updatedAt?: string;
  /** Current version number; every change is kept. */
  version?: number;
  /** Proposed changes waiting for a second admin. */
  pendingChanges?: number;
}

export interface PolicyTemplate extends Omit<AgentPolicy, 'enabled' | 'createdAt' | 'updatedAt'> {
  description: string;
}

export interface AgentRef {
  _id: string;
  name: string;
  kind: AgentKind;
}

export interface AgentApproval {
  id: string;
  workspaceId: string | null;
  projectId: string | null;
  agentId: AgentRef | string;
  ownerUserId: UserRef | string;
  channel: 'mcp' | 'rest';
  action: string;
  domain: string;
  risk: RiskLevel;
  inputPreview: Record<string, unknown>;
  request?: { method: string; path: string } | null;
  policyName?: string | null;
  status: ApprovalStatus;
  decidedBy?: UserRef | string | null;
  decidedAt?: string | null;
  note?: string | null;
  result?: unknown;
  error?: string | null;
  expiresAt: string;
  createdAt: string;
  tier?: 'low' | 'medium' | 'high' | 'critical' | null;
  recommendation?: { decision: 'approve' | 'reject'; reasons: string[] } | null;
  dlp?: DlpFinding[];
  decidedBySystem?: boolean;
  classification?: Classification | null;
  signals?: string[];
}

export interface AgentActivity {
  id: string;
  agentId: AgentRef | string;
  workspaceId: string | null;
  projectId: string | null;
  userId: string;
  channel: 'mcp' | 'rest';
  action: string;
  domain: string;
  risk: RiskLevel;
  input: Record<string, unknown>;
  outcome: ActivityOutcome;
  statusCode?: number | null;
  policyName?: string | null;
  advisoryPolicies: string[];
  approvalId?: string | null;
  error?: string | null;
  durationMs?: number | null;
  undoable: boolean;
  undoneAt?: string | null;
  undo: { entityType: 'task' | 'epic'; entityId: string } | null;
  decidedBy?: 'policy' | 'system' | 'person' | null;
  rule?: string | null;
  tier?: string | null;
  dlp?: DlpFinding[];
  createdAt: string;
}

export interface AgentAlert {
  id: string;
  /** Null for vendor alerts. */
  agentId: AgentRef | string | null;
  vendorId?: { _id: string; name: string } | string | null;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export interface ComplianceControl {
  id: string;
  framework: string;
  title: string;
  status: 'met' | 'partial' | 'gap';
  evidence: string;
  recommendation: string | null;
}

export interface ComplianceReport {
  workspace: { id: string; name: string };
  generatedAt: string;
  score: number;
  controls: ComplianceControl[];
  agents: Array<{
    id: string;
    name: string;
    kind: AgentKind;
    status: AgentStatus;
    riskLevel: AgentRiskLevel;
    scopes: string[];
    projectCount: number;
    legacy: boolean;
    expiresAt: string | null;
  }>;
  disclaimer: string;
  /** Score history, one point per day. */
  trend?: Array<{ date: string; score: number }>;
  lastEvidencePack?: { at: string; title: string } | null;
}

export interface GovernanceSettings {
  workspaceId: string;
  aiDataMasking: boolean;
  /** Scripts must use agent keys; personal logins from scripts are refused. */
  requireAgentKeys: boolean;
  /** Agents unused this long are suspended; 0 means never. */
  inactiveAgentDays: number;
  inactiveAgentDayOptions: number[];
  /** Monthly AI budget in USD; 0 means no limit. */
  aiMonthlyBudgetUsd: number;
  /** Refuse AI calls once the budget is used up. */
  aiBudgetHardStop: boolean;
  /** Vendors under review may only read until approved. */
  approvedVendorsOnly: boolean;
  activityRetentionDays: number;
  governance: HybridGovernance;
}

/** Hybrid governance: what runs on its own and what waits for a person. */
export interface HybridGovernance {
  mode: 'advisory' | 'auto_low_risk' | 'full_enforce';
  autoApproveRepeatDays: number;
  criticalAutoSuspend: boolean;
  dlpMode: 'off' | 'monitor' | 'enforce';
  threatDetection: boolean;
  incidentAutoContain: boolean;
  keyMaxAgeDays: number;
  complianceEnforce: boolean;
  complianceReportSchedule: 'off' | 'weekly' | 'monthly';
  allowedDataRegions: string[];
  anomalyDetection: boolean;
  correlation: boolean;
  sessionRisk: boolean;
  classificationEnforce: boolean;
  jitEnabled: boolean;
  jitMaxMinutes: number;
  jitAutoGrantLowRisk: boolean;
  keyRotation: 'off' | 'notify' | 'auto';
  keyGraceHours: number;
  vendorKeyMaxDays: number;
  policyChangeApproval: boolean;
}

export interface AgentBaseline {
  days: number;
  sample: number;
  hourlyP50: number;
  hourlyP95: number;
  dailyP50: number;
  dailyP95: number;
  actions: string[];
  projects: string[];
  errorRate: number;
  ready: boolean;
  computedAt: string;
}

export interface AgentElevation {
  id: string;
  agentId: AgentRef | string;
  scopes: string[];
  reason: string;
  durationMinutes: number;
  status: 'pending' | 'active' | 'rejected' | 'expired' | 'revoked';
  tier: 'low' | 'medium' | 'high';
  decidedBy?: UserRef | string | null;
  decidedBySystem: boolean;
  decidedAt?: string | null;
  grantedAt?: string | null;
  expiresAt: string;
  endedAt?: string | null;
  usedCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface PolicyChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  action: 'created' | 'updated' | 'deleted' | 'rolled_back';
  status: 'applied' | 'proposed' | 'rejected' | 'withdrawn';
  snapshot: Omit<AgentPolicy, 'id'> | null;
  previous: Omit<AgentPolicy, 'id'> | null;
  changedBy: UserRef | string;
  reviewedBy?: UserRef | string | null;
  note?: string | null;
  createdAt: string;
  changes: PolicyChange[];
  /** Proposals: whether this viewer may approve it (not their own). */
  canDecide?: boolean;
}

export interface SimulationResult {
  days: number;
  since: string;
  capped: boolean;
  total: number;
  current: Record<PolicyEffect, number>;
  proposed: Record<PolicyEffect, number>;
  changed: Record<string, number>;
  samples: Array<{ at: string; agentId: string; agentName: string; action: string; risk: RiskLevel; before: PolicyEffect; after: PolicyEffect; policy: string | null }>;
  note: string;
}

export type PlaybookStepType = 'suspend_agent' | 'require_reapproval' | 'create_incident' | 'notify' | 'wait_for_approval' | 'revoke_agent';

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: { types: string[]; minSeverity: 'info' | 'warning' | 'critical' };
  steps: Array<{ type: PlaybookStepType; label?: string }>;
  lastRunAt?: string | null;
  runCount: number;
  createdAt: string;
}

export interface PlaybookTemplates {
  templates: Array<{ key: string; name: string; description: string; trigger: Playbook['trigger']; steps: Array<{ type: PlaybookStepType; label: string }> }>;
  triggers: string[];
  steps: Array<{ type: PlaybookStepType; label: string }>;
}

export interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookName: string;
  agentId?: AgentRef | string | null;
  trigger: { type: string; severity: string; title: string; detail: string };
  status: 'running' | 'waiting' | 'completed' | 'cancelled' | 'failed';
  steps: Array<{ type: PlaybookStepType; label: string; status: 'pending' | 'done' | 'skipped' | 'failed' | 'waiting'; actor?: 'system' | 'person' | null; detail?: string; at?: string | null }>;
  incidentId?: string | null;
  decidedBy?: UserRef | string | null;
  createdAt: string;
}

export interface DlpFinding {
  type: string;
  label: string;
  confidence: 'high' | 'medium';
  count: number;
}

export interface IncidentEntry {
  at: string;
  actor: 'system' | 'person';
  action: string;
  detail: string;
}

export interface AgentIncident {
  id: string;
  title: string;
  severity: 'warning' | 'critical';
  trigger: string;
  status: 'open' | 'contained' | 'resolved';
  action: string | null;
  summary: string;
  agents: Array<{ id: string; name: string; status: AgentStatus; kind: AgentKind; riskLevel: AgentRiskLevel | null }>;
  timeline: IncidentEntry[];
  suggestions: string[];
  windowFrom: string;
  windowTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AgentIncidentDetail extends AgentIncident {
  activity: AgentActivity[];
  alerts: AgentAlert[];
  relatedAgents: Array<{ id: string; name: string; status: AgentStatus; kind: AgentKind; riskLevel: AgentRiskLevel | null }>;
}

export interface CostRow {
  id: string | null;
  label: string;
  cost: number;
  calls: number;
  tokens: number;
  errors: number;
  kind?: AgentKind | null;
}

export interface CostReport {
  month: string;
  budgetUsd: number;
  hardStop: boolean;
  percent: number | null;
  level: 'ok' | 'warning' | 'exceeded' | 'unlimited';
  total: { cost: number; calls: number; tokens: number; errors: number };
  byProvider: CostRow[];
  byAgent: CostRow[];
  byUser: CostRow[];
  byProject: CostRow[];
  bySource: CostRow[];
  daily: CostRow[];
}

export interface AgentReach {
  windowDays: number;
  since: string;
  /** Too new to judge its use; no suggestion yet. */
  tooNew: boolean;
  scopes: Array<{ scope: string; used: number; removable: boolean; logged: boolean }>;
  projects: {
    all: boolean;
    ownerProjectCount: number | null;
    granted: Array<{ id: string; name: string; used: number }>;
    used: Array<{ id: string | null; name: string; calls: number }>;
  };
  suggestion: { scopes: string[]; projectIds: string[] } | null;
}

export type WebhookEvent = 'alert.raised' | 'approval.requested' | 'approval.decided' | 'activity.blocked';

export interface AgentWebhook {
  id: string;
  name: string;
  url: string;
  format: 'json' | 'slack';
  events: WebhookEvent[];
  minSeverity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  disabledReason?: string | null;
  consecutiveFailures: number;
  lastDeliveryAt?: string | null;
  lastStatus?: number | null;
  lastError?: string | null;
  createdAt: string;
}

export type WebhookInput = Partial<Pick<AgentWebhook, 'name' | 'url' | 'format' | 'events' | 'minSeverity' | 'enabled'>>;

export interface ToolCatalog {
  tools: Array<{ name: string; domain: string; risk: RiskLevel; description: string }>;
  risks: RiskLevel[];
  scopes: string[];
  standardScopes: string[];
}

export interface PromptFinding {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  framework: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

const ws = (workspaceId?: string | null) => (workspaceId ? { workspaceId } : {});
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> => promise.then((res) => res.data.data);

export const agentsApi = {
  overview: (workspaceId?: string | null) =>
    unwrap<AgentOverview>(api.get('/agents/overview', { params: ws(workspaceId), silent: true })),
  catalog: () => unwrap<ToolCatalog>(api.get('/agents/catalog', { silent: true })),

  list: (params: { workspaceId?: string | null; kind?: string; status?: string; risk?: string; q?: string } = {}) =>
    unwrap<Agent[]>(api.get('/agents', { params: { ...params, workspaceId: params.workspaceId ?? undefined } })),
  get: (agentId: string, refresh = false) =>
    unwrap<AgentDetail>(api.get(`/agents/${agentId}`, { params: refresh ? { refresh: '1' } : {} })),
  createKey: (body: { name: string; scopes?: string[]; projectIds?: string[]; expiresAt?: string | null; workspaceId?: string | null; operatedBy?: 'internal' | 'vendor'; vendorId?: string | null }) =>
    unwrap<{ agent: Agent; key: string }>(api.post('/agents/keys', body)),
  update: (agentId: string, body: Partial<Pick<Agent, 'name' | 'scopes' | 'projectIds' | 'rateLimitPerMinute' | 'operatedBy'>> & { expiresAt?: string | null }) =>
    unwrap<Agent>(api.patch(`/agents/${agentId}`, body)),
  /** New key; with graceHours the old one keeps working that long. */
  rotate: (agentId: string, graceHours = 0) => unwrap<{ agent: Agent; key: string }>(api.post(`/agents/${agentId}/rotate`, { graceHours })),
  /** The owner collects a key the system rotated (shown once). */
  revealPendingKey: (agentId: string) => unwrap<{ key: string; previousKeyExpiresAt: string | null }>(api.post(`/agents/${agentId}/pending-key/reveal`)),
  baseline: (agentId: string, refresh = false) =>
    unwrap<{ baseline: AgentBaseline | null; current: { changesLastHour: number; ratio: number | null } }>(
      api.get(`/agents/${agentId}/baseline`, { params: refresh ? { refresh: '1' } : {}, silent: true })
    ),
  elevations: (params: { status?: string; agentId?: string } = {}) =>
    unwrap<AgentElevation[]>(api.get('/agents/elevations', { params, silent: true })),
  approveElevation: (id: string, durationMinutes?: number) => unwrap<AgentElevation>(api.post(`/agents/elevations/${id}/approve`, { durationMinutes })),
  rejectElevation: (id: string, note?: string) => unwrap<AgentElevation>(api.post(`/agents/elevations/${id}/reject`, { note })),
  revokeElevation: (id: string) => unwrap<AgentElevation>(api.post(`/agents/elevations/${id}/revoke`)),
  classification: (params: { projectIds?: string[]; taskIds?: string[] }) =>
    unwrap<{ labels: Classification[]; projects: Record<string, Classification | null>; tasks: Record<string, Classification | null> }>(
      api.get('/agents/classification', { params: { projectIds: params.projectIds?.join(','), taskIds: params.taskIds?.join(',') }, silent: true })
    ),
  setClassification: (body: { projectId?: string; taskId?: string; classification: Classification | null }) =>
    unwrap<{ projectId: string | null; taskId: string | null; classification: Classification | null }>(api.put('/agents/classification', body)),
  runKeyLifecycle: (workspaceId?: string | null) =>
    unwrap<{ notified: number; rotated: number; confirm: number; retired: number }>(api.post('/agents/key-lifecycle/run', ws(workspaceId))),
  simulatePolicy: (body: { policy?: Omit<AgentPolicy, 'id'>; policyId?: string; remove?: boolean; days?: number }, workspaceId?: string | null) =>
    unwrap<SimulationResult>(api.post('/agents/policies/simulate', { ...body, ...ws(workspaceId) })),
  policyVersions: (policyId: string) => unwrap<PolicyVersion[]>(api.get(`/agents/policies/${policyId}/versions`)),
  rollbackPolicy: (policyId: string, version: number) =>
    unwrap<{ policy: AgentPolicy | null; version: PolicyVersion }>(api.post(`/agents/policies/${policyId}/rollback`, { version })),
  policyProposals: () => unwrap<PolicyVersion[]>(api.get('/agents/policies/proposals', { silent: true })),
  approveProposal: (versionId: string) => unwrap<{ version: PolicyVersion }>(api.post(`/agents/policies/proposals/${versionId}/approve`)),
  rejectProposal: (versionId: string, note?: string) => unwrap<PolicyVersion>(api.post(`/agents/policies/proposals/${versionId}/reject`, { note })),
  exportPolicies: async (workspaceId?: string | null) => {
    const response = await api.get('/agents/policies/export', { params: ws(workspaceId), responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-policies-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
  playbooks: (workspaceId?: string | null) => unwrap<Playbook[]>(api.get('/agents/playbooks', { params: ws(workspaceId) })),
  playbookTemplates: () => unwrap<PlaybookTemplates>(api.get('/agents/playbooks/templates', { silent: true })),
  createPlaybook: (body: Partial<Omit<Playbook, 'id' | 'steps'>> & { template?: string; steps?: PlaybookStepType[] }, workspaceId?: string | null) =>
    unwrap<Playbook>(api.post('/agents/playbooks', { ...body, ...ws(workspaceId) })),
  updatePlaybook: (id: string, body: Partial<Omit<Playbook, 'id' | 'steps'>> & { steps?: PlaybookStepType[] }) => unwrap<Playbook>(api.patch(`/agents/playbooks/${id}`, body)),
  deletePlaybook: (id: string) => unwrap<{ deleted: boolean }>(api.delete(`/agents/playbooks/${id}`)),
  playbookRuns: (status?: string) => unwrap<PlaybookRun[]>(api.get('/agents/playbook-runs', { params: status ? { status } : {}, silent: true })),
  continueRun: (id: string) => unwrap<PlaybookRun>(api.post(`/agents/playbook-runs/${id}/continue`)),
  cancelRun: (id: string, note?: string) => unwrap<PlaybookRun>(api.post(`/agents/playbook-runs/${id}/cancel`, { note })),
  reach: (agentId: string) => unwrap<AgentReach>(api.get(`/agents/${agentId}/reach`)),
  webhooks: (workspaceId?: string | null) => unwrap<AgentWebhook[]>(api.get('/agents/webhooks', { params: ws(workspaceId) })),
  createWebhook: (body: WebhookInput, workspaceId?: string | null) =>
    unwrap<{ webhook: AgentWebhook; secret: string }>(api.post('/agents/webhooks', { ...body, ...ws(workspaceId) })),
  updateWebhook: (id: string, body: WebhookInput & { rotateSecret?: boolean }, workspaceId?: string | null) =>
    unwrap<{ webhook: AgentWebhook; secret: string | null }>(api.patch(`/agents/webhooks/${id}`, { ...body, ...ws(workspaceId) })),
  deleteWebhook: (id: string, workspaceId?: string | null) => unwrap<unknown>(api.delete(`/agents/webhooks/${id}`, { params: ws(workspaceId) })),
  testWebhook: (id: string, workspaceId?: string | null) =>
    unwrap<{ ok: boolean; status: number | null; body: string }>(api.post(`/agents/webhooks/${id}/test`, ws(workspaceId))),
  /** Confirms the agent still needs its access (access review). */
  review: (agentId: string) => unwrap<Agent>(api.post(`/agents/${agentId}/review`)),
  /** Gives an unregistered agent its own key and retires the detected one. */
  replaceWithKey: (agentId: string, body: { name: string; scopes?: string[]; projectIds?: string[]; expiresAt?: string | null }) =>
    unwrap<{ agent: Agent; key: string }>(api.post(`/agents/${agentId}/replace-with-key`, body)),
  suspend: (agentId: string, reason?: string) => unwrap<Agent>(api.post(`/agents/${agentId}/suspend`, { reason })),
  resume: (agentId: string) => unwrap<Agent>(api.post(`/agents/${agentId}/resume`)),
  revoke: (agentId: string, reason?: string) => unwrap<Agent>(api.post(`/agents/${agentId}/revoke`, { reason })),
  killSwitch: (workspaceId?: string | null, reason?: string) =>
    unwrap<{ suspended: number }>(api.post('/agents/kill-switch', { ...ws(workspaceId), reason })),

  activity: (params: { workspaceId?: string | null; agentId?: string; outcome?: string; risk?: string; before?: string; limit?: number } = {}) =>
    unwrap<AgentActivity[]>(api.get('/agents/activity', { params: { ...params, workspaceId: params.workspaceId ?? undefined } })),
  undo: (activityId: string) =>
    unwrap<{ undone: boolean; entityType: string; entityId: string; restored: boolean }>(api.post(`/agents/activity/${activityId}/undo`)),
  exportActivity: async (format: 'csv' | 'json', workspaceId?: string | null) => {
    const res = await api.get('/agents/activity/export', {
      params: { format, ...ws(workspaceId) },
      responseType: 'blob'
    });
    return res.data as Blob;
  },

  policies: (workspaceId?: string | null) => unwrap<AgentPolicy[]>(api.get('/agents/policies', { params: ws(workspaceId) })),
  templates: () => unwrap<PolicyTemplate[]>(api.get('/agents/policies/templates', { silent: true })),
  createPolicy: (body: Omit<AgentPolicy, 'id'>, workspaceId?: string | null) =>
    unwrap<AgentPolicy>(api.post('/agents/policies', { ...body, ...ws(workspaceId) })),
  updatePolicy: (policyId: string, body: Partial<Omit<AgentPolicy, 'id'>>) =>
    unwrap<AgentPolicy>(api.patch(`/agents/policies/${policyId}`, body)),
  deletePolicy: (policyId: string) => unwrap<{ deleted: boolean }>(api.delete(`/agents/policies/${policyId}`)),
  testPolicies: (
    body: { action: string; agentKind?: AgentKind; agentId?: string; risk?: RiskLevel; projectId?: string; at?: string },
    workspaceId?: string | null
  ) =>
    unwrap<{ effect: PolicyEffect; policy: { id: string; name: string } | null; advisory: Array<{ id: string; name: string; effect: PolicyEffect }>; risk: RiskLevel }>(
      api.post('/agents/policies/test', { ...body, ...ws(workspaceId) })
    ),

  /** AI spend for a project, or for your own calls since a time (one plan, one breakdown). */
  costSummary: (params: { projectId?: string; since?: string }) =>
    unwrap<{ usd: number; tokens: number; calls: number }>(api.get('/agents/costs/summary', { params, silent: true })),
  approvals: (status?: ApprovalStatus) =>
    unwrap<AgentApproval[]>(api.get('/agents/approvals', { params: status ? { status } : {} })),
  approve: (approvalId: string, note?: string) => unwrap<AgentApproval>(api.post(`/agents/approvals/${approvalId}/approve`, { note })),
  reject: (approvalId: string, note?: string) => unwrap<AgentApproval>(api.post(`/agents/approvals/${approvalId}/reject`, { note })),

  alerts: (params: { open?: boolean; agentId?: string } = {}) =>
    unwrap<AgentAlert[]>(api.get('/agents/alerts', { params: { open: params.open ? '1' : undefined, agentId: params.agentId } })),
  acknowledgeAlert: (alertId: string) => unwrap<AgentAlert>(api.post(`/agents/alerts/${alertId}/acknowledge`)),

  compliance: (workspaceId?: string | null) => unwrap<ComplianceReport>(api.get('/agents/compliance', { params: ws(workspaceId) })),
  settings: (workspaceId?: string | null) => unwrap<GovernanceSettings>(api.get('/agents/settings', { params: ws(workspaceId) })),
  costs: (workspaceId?: string | null, month?: string) =>
    unwrap<CostReport>(api.get('/agents/costs', { params: { ...ws(workspaceId), month } })),
  updateSettings: (
    body: {
      governance?: Partial<HybridGovernance>;
      aiDataMasking?: boolean;
      requireAgentKeys?: boolean;
      approvedVendorsOnly?: boolean;
      inactiveAgentDays?: number;
      aiMonthlyBudgetUsd?: number;
      aiBudgetHardStop?: boolean;
    },
    workspaceId?: string | null) =>
    unwrap<GovernanceSettings>(api.patch('/agents/settings', { ...body, ...ws(workspaceId) })),
  complianceCheck: () => unwrap<{ score: number; drifted: Array<{ id: string; title: string; status: string }>; trend: Array<{ date: string; score: number }> }>(api.post('/agents/compliance/check')),
  /** Evidence pack ZIP for a date range, downloaded as a file. */
  downloadEvidencePack: async (from?: string, to?: string) => {
    const response = await api.get('/agents/compliance/evidence', { params: { from, to }, responseType: 'blob' });
    const name = /filename="([^"]+)"/.exec(String(response.headers['content-disposition'] ?? ''))?.[1] ?? 'compliance-evidence.zip';
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
  scopeDown: (approvalId: string) => unwrap<{ removedScope: string }>(api.post(`/agents/approvals/${approvalId}/scope-down`)),
  incidents: (status?: 'open' | 'resolved') => unwrap<AgentIncident[]>(api.get('/agents/incidents', { params: status ? { status } : {} })),
  incident: (id: string) => unwrap<AgentIncidentDetail>(api.get(`/agents/incidents/${id}`)),
  incidentAction: (id: string, action: 'resume' | 'revoke' | 'resolve' | 'expand' | 'notify', body: Record<string, unknown> = {}) =>
    unwrap<AgentIncident>(api.post(`/agents/incidents/${id}/${action}`, body)),
  downloadIncidentEvidence: async (id: string) => {
    const response = await api.get(`/agents/incidents/${id}/evidence`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident-${id}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
  promptChecks: (body: { body?: string; messages?: Array<{ role: string; content: string }>; parameters?: { maxTokens?: number } }) =>
    unwrap<{ findings: PromptFinding[]; blocking: boolean }>(api.post('/agents/prompt-checks', body, { silent: true }))
};

/* -------------------------------- Labels -------------------------------- */

export const CLASSIFICATION_LABELS: Record<Classification, { label: string; detail: string; tone: string }> = {
  public: { label: 'Public', detail: 'No extra rules.', tone: 'bg-slate-100 text-slate-700' },
  internal: { label: 'Internal', detail: 'The default.', tone: 'bg-slate-100 text-slate-700' },
  confidential: { label: 'Confidential', detail: "Agents' changes need a person; personal data in it never goes to AI models.", tone: 'bg-amber-50 text-amber-800' },
  restricted: { label: 'Restricted', detail: 'Never sent to AI models or exported; agent changes are high risk.', tone: 'bg-red-50 text-red-700' }
};

export const KIND_LABELS: Record<AgentKind, string> = {
  api_key: 'API key',
  mcp_client: 'MCP client',
  chatgpt: 'ChatGPT',
  companion: 'Companion device',
  ai_provider: 'AI provider',
  detected: 'Unregistered'
};

export const DETECTION_SIGNAL_LABELS: Record<string, string> = {
  automation_library: 'Uses an HTTP library or AI framework',
  headless_browser: 'Automated (headless) browser',
  no_user_agent: 'Sends no user agent',
  not_a_browser: 'Client is not a web browser',
  browser_without_fetch_metadata: "Claims to be a browser but sends none of a browser's request headers"
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  read: 'Read',
  write: 'Write',
  sensitive_write: 'Sensitive write',
  destructive: 'Destructive',
  security_critical: 'Security critical'
};

export const EFFECT_LABELS: Record<PolicyEffect, string> = {
  allow: 'Allow',
  deny: 'Block',
  require_approval: 'Require approval'
};

export const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  'work:read': { label: 'Read work', description: 'Tasks, projects, epics and activity.' },
  'work:write': { label: 'Change work', description: 'Create, update, assign and delete tasks, projects and epics.' },
  'collaboration:read': { label: 'Read collaboration', description: 'Notes, comments and chat.' },
  'collaboration:write': { label: 'Write collaboration', description: 'Add comments and notes.' },
  'analytics:read': { label: 'Analytics', description: 'Metrics, SLA analytics and forecasts.' },
  'ai:execute': { label: 'Run AI', description: 'Planning, task breakdown and note generation.' },
  'prompt:read': { label: 'Read prompts', description: 'Prompt Library templates and versions.' },
  'prompt:write': { label: 'Write prompts', description: 'Run prompts in the playground.' },
  'workspace:admin': { label: 'Workspace admin', description: 'Workspace details and members. Admins only.' }
};

export const agentName = (ref: AgentRef | string | null | undefined): string =>
  ref && typeof ref === 'object' ? ref.name : 'Unknown agent';

export const userLabel = (ref: UserRef | string | null | undefined): string =>
  ref && typeof ref === 'object' ? ref.name || ref.email || 'Unknown' : 'Unknown';

export const timeAgo = (iso?: string | null): string => {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
};
