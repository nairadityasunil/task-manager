import api from '@/services/api';

export type AgentKind = 'api_key' | 'mcp_client' | 'chatgpt' | 'companion' | 'ai_provider';
export type AgentStatus = 'active' | 'suspended' | 'revoked';
export type AgentRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'read' | 'write' | 'sensitive_write' | 'destructive' | 'security_critical';
export type PolicyEffect = 'allow' | 'deny' | 'require_approval';
export type PolicyMode = 'enforce' | 'advisory';
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
  lastSeenAt?: string | null;
  callCount: number;
  riskScore: number;
  riskLevel: AgentRiskLevel;
  riskFactors: RiskFactor[];
  riskEvaluatedAt?: string | null;
  createdAt: string;
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
}

export interface PolicyMatch {
  agentKinds?: AgentKind[];
  agentIds?: string[];
  tools?: string[];
  domains?: string[];
  minRisk?: RiskLevel;
  projectIds?: string[];
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
  createdAt: string;
}

export interface AgentAlert {
  id: string;
  agentId: AgentRef | string;
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
}

export interface GovernanceSettings {
  workspaceId: string;
  aiDataMasking: boolean;
  activityRetentionDays: number;
}

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
  createKey: (body: { name: string; scopes?: string[]; projectIds?: string[]; expiresAt?: string | null; workspaceId?: string | null }) =>
    unwrap<{ agent: Agent; key: string }>(api.post('/agents/keys', body)),
  update: (agentId: string, body: Partial<Pick<Agent, 'name' | 'scopes' | 'projectIds'>> & { expiresAt?: string | null }) =>
    unwrap<Agent>(api.patch(`/agents/${agentId}`, body)),
  rotate: (agentId: string) => unwrap<{ agent: Agent; key: string }>(api.post(`/agents/${agentId}/rotate`)),
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

  approvals: (status?: ApprovalStatus) =>
    unwrap<AgentApproval[]>(api.get('/agents/approvals', { params: status ? { status } : {} })),
  approve: (approvalId: string, note?: string) => unwrap<AgentApproval>(api.post(`/agents/approvals/${approvalId}/approve`, { note })),
  reject: (approvalId: string, note?: string) => unwrap<AgentApproval>(api.post(`/agents/approvals/${approvalId}/reject`, { note })),

  alerts: (params: { open?: boolean; agentId?: string } = {}) =>
    unwrap<AgentAlert[]>(api.get('/agents/alerts', { params: { open: params.open ? '1' : undefined, agentId: params.agentId } })),
  acknowledgeAlert: (alertId: string) => unwrap<AgentAlert>(api.post(`/agents/alerts/${alertId}/acknowledge`)),

  compliance: (workspaceId?: string | null) => unwrap<ComplianceReport>(api.get('/agents/compliance', { params: ws(workspaceId) })),
  settings: (workspaceId?: string | null) => unwrap<GovernanceSettings>(api.get('/agents/settings', { params: ws(workspaceId) })),
  updateSettings: (body: { aiDataMasking?: boolean }, workspaceId?: string | null) =>
    unwrap<GovernanceSettings>(api.patch('/agents/settings', { ...body, ...ws(workspaceId) })),
  promptChecks: (body: { body?: string; messages?: Array<{ role: string; content: string }>; parameters?: { maxTokens?: number } }) =>
    unwrap<{ findings: PromptFinding[]; blocking: boolean }>(api.post('/agents/prompt-checks', body, { silent: true }))
};

/* -------------------------------- Labels -------------------------------- */

export const KIND_LABELS: Record<AgentKind, string> = {
  api_key: 'API key',
  mcp_client: 'MCP client',
  chatgpt: 'ChatGPT',
  companion: 'Companion device',
  ai_provider: 'AI provider'
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
