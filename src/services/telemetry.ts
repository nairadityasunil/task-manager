import api from '@/services/api';

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> =>
  promise.then((res) => res.data.data);

export interface HealthSignals {
  sla: {
    open: number;
    breached: number;
    health: number | null;
    worstProject: { id: string; name: string; open: number; breached: number } | null;
  };
  agents: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unregistered: number;
  };
  engagement: {
    completionRate: number | null;
    previousRate: number | null;
    people: number;
    worstGuide: {
      id: string;
      title: string;
      integrationId: string;
      rate: number;
      previous: number | null;
    } | null;
  } | null;
  /** Null for people who do not administer the workspace. */
  compliance: { score: number; change: number | null; failing: number } | null;
  incidents: number | null;
  autoTasks: number;
  generatedAt: string;
}

export type AutomationRule =
  | 'guide_dropoff'
  | 'guide_completion_drop'
  | 'survey_score'
  | 'event_spike'
  | 'sla_breaches'
  | 'shadow_ai'
  | 'compliance_gap'
  | 'incident'
  | 'key_expiry'
  | 'vendor_review'
  | 'project_governance'
  | 'metric_alert'
  | 'ai_governance';

export interface AutomationSettings {
  enabled: boolean;
  projectId: string | null;
  rules: Record<AutomationRule, boolean>;
  dropOffThreshold: number;
  minSample: number;
  surveyScoreThreshold: number;
  remeasureDays: number;
  eventRetentionDays: number;
}

export interface Metric {
  name: string;
  unit: 'percent' | 'score' | 'count';
  value: number;
  lowerIsBetter: boolean;
}

export interface MetricResult {
  value: number;
  measuredAt: string;
  outcome: 'improved' | 'worse' | 'unchanged';
  sample: number;
}

export interface AutomationTask {
  id: string;
  rule: AutomationRule;
  title: string;
  state: 'open' | 'closed';
  closedBy: 'person' | 'system' | null;
  taskId: string;
  taskExists: boolean;
  taskStatus: string | null;
  priority: string | null;
  projectId: string | null;
  sourceLink: string;
  escalated: boolean;
  metric: Metric | null;
  result: MetricResult | null;
  remeasureAt: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface AutomationOverview {
  canAdmin: boolean;
  settings: AutomationSettings;
  rules: Array<{
    id: AutomationRule;
    label: string;
    detail: string;
    group: 'telemetry' | 'governance';
  }>;
  retentionOptions: number[];
  tasks: AutomationTask[];
}

export interface TaskAutomation {
  rule: AutomationRule;
  sourceLink: string;
  state: 'open' | 'done' | 'cleared';
  closedBy: 'person' | 'system' | null;
  metric: Metric | null;
  result: MetricResult | null;
  remeasureAt: string | null;
  createdAt: string;
}

interface GovernancePeriod {
  shadowAi: {
    detected: number;
    remediated: number;
    detectMs: number | null;
    remediateMs: number | null;
  };
  approvals: { decided: number; averageMs: number | null; medianMs: number | null };
  incidents: { opened: number; containMs: number | null; resolveMs: number | null };
  policies: {
    actions: number;
    hitRate: number | null;
    outcomes: Record<string, number>;
    top: Array<{ name: string; hits: number }>;
  };
}

export interface GovernanceTelemetry {
  days: number;
  current: GovernancePeriod;
  previous: GovernancePeriod;
  complianceTrend: Array<{ date: string; score: number }>;
}

export interface AgentTelemetryRow {
  id: string;
  name: string;
  kind: string;
  status: string;
  riskLevel: string;
  calls: number;
  allowed: number;
  blocked: number;
  held: number;
  errors: number;
  latencyMs: number | null;
  aiCalls: number;
  tokens: number;
  costUsd: number;
  aiLatencyMs: number | null;
}

export interface AgentTelemetry {
  days: number;
  agents: AgentTelemetryRow[];
  totals: { calls: number; blocked: number; held: number; costUsd: number; tokens: number };
}

export interface Person {
  user: string;
  lastSeen: string;
  events: number;
  sessions: number;
}

export interface JourneyItem {
  at: string;
  kind: 'event' | 'guide' | 'survey';
  title: string;
  detail?: string;
  sessionId?: string | null;
  properties?: Record<string, unknown>;
  link: string;
}

export interface Journey {
  items: JourneyItem[];
  summary: {
    events: number;
    guidesCompleted: number;
    guidesLeft: number;
    surveys: number;
    firstSeen: string | null;
    lastSeen: string | null;
  };
}

export const telemetryApi = {
  health: () => unwrap<HealthSignals>(api.get('/telemetry/health', { silent: true })),
  governance: (days = 30) =>
    unwrap<GovernanceTelemetry>(api.get('/telemetry/governance', { params: { days } })),
  agents: (days = 7) => unwrap<AgentTelemetry>(api.get('/telemetry/agents', { params: { days } })),
  people: (integrationId: string, q?: string) =>
    unwrap<Person[]>(
      api.get('/telemetry/people', { params: { integrationId, q: q || undefined } }),
    ),
  journey: (integrationId: string, who: { user?: string; session?: string }) =>
    unwrap<Journey>(api.get('/telemetry/journey', { params: { integrationId, ...who } })),
  automation: () => unwrap<AutomationOverview>(api.get('/telemetry/automation')),
  updateAutomation: (
    patch: Partial<Omit<AutomationSettings, 'rules'>> & {
      rules?: Partial<Record<AutomationRule, boolean>>;
    },
  ) => unwrap<{ settings: AutomationSettings }>(api.patch('/telemetry/automation', patch)),
  run: () =>
    unwrap<{ opened: number; closed: number; measured: number; tasks: AutomationTask[] }>(
      api.post('/telemetry/automation/run'),
    ),
  forTask: (taskId: string) =>
    unwrap<TaskAutomation | null>(
      api.get(`/telemetry/automation/task/${taskId}`, { silent: true }),
    ),
  projectGovernance: (projectIds: string[]) =>
    unwrap<Record<string, 'ready' | 'pending'>>(
      api.get('/telemetry/projects/governance', {
        params: { projectIds: projectIds.join(',') },
        silent: true,
      }),
    ),
};

export const formatMetric = (unit: Metric['unit'], value: number): string =>
  unit === 'percent'
    ? `${Math.round(value * 100)}%`
    : unit === 'score'
      ? value.toFixed(1)
      : String(Math.round(value));

/** "6 hours", "2 days", "40 seconds". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const unit = (value: number, name: string): string => `${value} ${name}${value === 1 ? '' : 's'}`;
  const s = ms / 1000;
  if (s < 90) return unit(Math.max(0, Math.round(s)), 'second');
  const m = s / 60;
  if (m < 90) return unit(Math.round(m), 'minute');
  const h = m / 60;
  if (h < 36) return unit(Math.round(h * 10) / 10, 'hour');
  return unit(Math.round((h / 24) * 10) / 10, 'day');
}

export const taskLink = (taskId: string, projectId?: string | null): string =>
  projectId ? `/projects/${projectId}?task=${taskId}` : `/dashboard?task=${taskId}`;

export const RULE_LABELS: Record<AutomationRule, string> = {
  guide_dropoff: 'Guide drop-off',
  guide_completion_drop: 'Guide completion',
  survey_score: 'Survey score',
  event_spike: 'Event volume',
  sla_breaches: 'SLA breaches',
  shadow_ai: 'Unregistered agent',
  compliance_gap: 'Compliance gap',
  incident: 'Incident',
  key_expiry: 'Key expiry',
  vendor_review: 'Third-party review',
  project_governance: 'New project',
  metric_alert: 'Metric alert',
  ai_governance: 'AI governance issue',
};
