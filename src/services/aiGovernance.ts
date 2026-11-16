import api from '@/services/api';
import { saveBlob } from '@/services/vendors';

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> =>
  promise.then((res) => res.data.data);

export type Stage =
  | 'proposed'
  | 'assessment'
  | 'development'
  | 'validation'
  | 'production'
  | 'retired';
export type Tier = 'low' | 'medium' | 'high' | 'prohibited';
export type AiType = 'generative' | 'predictive' | 'agentic' | 'rules';
export type EuCategory = 'prohibited' | 'high' | 'limited' | 'minimal' | 'out_of_scope';
export type ApproverRole = 'owner' | 'risk' | 'legal' | 'ethics' | 'security';
export type Gate = 'development' | 'production';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'accepted';
export type EvalStatus = 'pass' | 'fail' | 'no_data';

export interface UseCaseSummary {
  id: string;
  ref: string;
  name: string;
  description: string;
  type: AiType;
  stage: Stage;
  status: 'active' | 'on_hold' | 'rejected';
  tier: Tier | null;
  euCategory: EuCategory | null;
  ownerUserId: string;
  score: number;
  evaluationStatus: EvalStatus | null;
  evaluatedAt: string | null;
  nextReviewAt: string | null;
  risks: number;
  updatedAt: string;
}

export interface MetricResult {
  key: string;
  label: string;
  value: number | null;
  threshold: number;
  direction: 'max' | 'min';
  unit: 'rate' | 'score' | 'ms';
  status: EvalStatus;
  samples: number;
}

export interface Risk {
  id: string;
  code: string | null;
  category: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  treatment: 'mitigate' | 'accept' | 'avoid' | 'transfer' | null;
  controls: string[];
  residualLikelihood: number | null;
  residualImpact: number | null;
  status: 'open' | 'mitigated' | 'accepted';
  note: string;
  level: 'low' | 'medium' | 'high' | 'critical';
}

export interface Approval {
  gate: Gate;
  role: ApproverRole;
  decision: 'approved' | 'rejected';
  by: string;
  byName: string;
  at: string;
  comment: string;
  void?: boolean;
}

export interface Requirement {
  id: string;
  label: string;
  met: boolean;
  section: 'assessment' | 'factsheet' | 'risks' | 'evaluations' | 'approvals' | 'issues' | 'review';
}

export interface EuObligation {
  article: string;
  title: string;
  detail: string;
  evidence: string;
}

export interface UseCase extends UseCaseSummary {
  businessValue: string;
  riskAnswers: Record<string, string>;
  euAnswers: Record<string, string | boolean>;
  assessment: {
    tier: Tier;
    points: number;
    reasons: string[];
    eu: {
      category: EuCategory;
      reasons: string[];
      obligations: EuObligation[];
      role: 'provider' | 'deployer' | null;
    };
    completedAt: string;
    by: string;
  } | null;
  factsheet: Record<string, string>;
  links: { agentIds: string[]; promptIds: string[]; vendorIds: string[]; integrationIds?: string[] };
  riskList: Risk[];
  approvals: Approval[];
  gates: Array<{
    gate: Gate;
    required: Array<{
      role: ApproverRole;
      label: string;
      signoff: Approval | null;
      canSign: boolean;
    }>;
    pending: ApproverRole[];
  }>;
  thresholds: Record<string, number>;
  evaluation: {
    ranAt: string;
    status: EvalStatus;
    windowDays: number;
    records: number;
    results: MetricResult[];
  } | null;
  baseline: { at: string; records: number } | null;
  reviewDays: number | null;
  lastAttestedAt: string | null;
  lastAttestedBy: string | null;
  scoreParts: Array<{
    id: string;
    label: string;
    points: number;
    max: number;
    checks: Array<{ label: string; met: boolean }>;
  }>;
  nextStage: Stage | null;
  requirements: Requirement[];
  openIssues: Array<{
    id: string;
    title: string;
    severity: Severity;
    status: IssueStatus;
    source: string;
  }>;
  history: Array<{ at: string; byName: string; action: string; detail: string }>;
  canEdit: boolean;
  canAdmin: boolean;
}

export interface Issue {
  id: string;
  useCaseId: string;
  useCaseName: string | null;
  useCaseRef: string | null;
  title: string;
  description: string;
  severity: Severity;
  status: IssueStatus;
  source: 'manual' | 'evaluation' | 'review';
  ownerUserId: string;
  dueAt: string | null;
  overdue: boolean;
  actions: Array<{ id: string; title: string; done: boolean; doneBy: string | null }>;
  resolution: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface Overview {
  total: number;
  byStage: Record<Stage, number>;
  byTier: { low: number; medium: number; high: number; unassessed: number };
  byEuCategory: Record<'high' | 'limited' | 'minimal' | 'out_of_scope', number>;
  prohibited: number;
  averageScore: number | null;
  productionScore: number | null;
  failingEvaluations: number;
  notEvaluated: number;
  overdueReviews: number;
  openIssues: { total: number; overdue: number } & Record<Severity, number>;
  risks: { total: number; untreated: number; heatmap: Record<string, number> };
  ungoverned: { agents: number; prompts: number };
  attention: Array<UseCaseSummary & { reason: string }>;
}

export interface Catalog {
  stages: Array<{ id: Stage; label: string }>;
  roles: Array<{ id: ApproverRole; label: string }>;
  metrics: Array<{
    key: string;
    label: string;
    description: string;
    direction: 'max' | 'min';
    unit: 'rate' | 'score' | 'ms';
    needs: string;
  }>;
  controls: Record<string, string>;
  riskCategories: Record<string, string>;
  factsheetFields: Array<{ key: string; label: string; required: boolean }>;
  riskQuestions: Array<{
    id: string;
    text: string;
    options: Array<{ value: string; label: string }>;
  }>;
  euQuestions: Array<{
    id: string;
    group: 'scope' | 'prohibited' | 'high_risk' | 'exception' | 'transparency' | 'role';
    text: string;
    kind: 'boolean' | 'choice';
    options?: Array<{ value: string; label: string }>;
  }>;
}

export interface SuggestedRisk {
  code: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  added: boolean;
}

export interface GovernanceSettings {
  approvers: Partial<Record<ApproverRole, string[]>>;
  highRiskExtraRoles: ApproverRole[];
  members: Array<{ id: string; name: string; email: string; role: string }>;
}

export interface RecordRow {
  id: string;
  at: string;
  input: string;
  output: string;
  feedback: 'up' | 'down' | null;
  flags: string[];
  /** "sdk" when an app's SDK key sent it, "api" when a person or agent did. */
  source?: 'api' | 'sdk';
}

const G = '/ai-governance';
const U = (id: string) => `${G}/use-cases/${id}`;

export const aiGovApi = {
  catalog: () => unwrap<Catalog>(api.get(`${G}/catalog`)),
  overview: () => unwrap<Overview>(api.get(`${G}/overview`, { silent: true })),
  ungoverned: () =>
    unwrap<{
      agents: Array<{ id: string; name: string; kind: string }>;
      prompts: Array<{ id: string; name: string }>;
    }>(api.get(`${G}/ungoverned`, { silent: true })),
  assets: () =>
    unwrap<{
      agents: Array<{ id: string; name: string }>;
      prompts: Array<{ id: string; name: string }>;
      vendors: Array<{ id: string; name: string }>;
      integrations: Array<{ id: string; name: string }>;
    }>(api.get(`${G}/assets`, { silent: true })),
  settings: () => unwrap<GovernanceSettings>(api.get(`${G}/settings`, { silent: true })),
  updateSettings: (body: Partial<Pick<GovernanceSettings, 'approvers' | 'highRiskExtraRoles'>>) =>
    unwrap<GovernanceSettings>(api.patch(`${G}/settings`, body, { silent: true })),

  list: () => unwrap<UseCaseSummary[]>(api.get(`${G}/use-cases`, { silent: true })),
  create: (body: Record<string, unknown>) =>
    unwrap<UseCase>(api.post(`${G}/use-cases`, body, { silent: true })),
  get: (id: string) => unwrap<UseCase>(api.get(U(id), { silent: true })),
  update: (id: string, body: Record<string, unknown>) =>
    unwrap<UseCase>(api.patch(U(id), body, { silent: true })),
  remove: (id: string) => unwrap<{ deleted: boolean }>(api.delete(U(id), { silent: true })),
  saveAssessment: (
    id: string,
    body: {
      riskAnswers: Record<string, string>;
      euAnswers: Record<string, string | boolean>;
      complete: boolean;
    },
  ) => unwrap<UseCase>(api.put(`${U(id)}/assessment`, body, { silent: true })),
  suggestedRisks: (id: string) =>
    unwrap<SuggestedRisk[]>(api.get(`${U(id)}/suggested-risks`, { silent: true })),
  addRisks: (id: string, body: { codes?: string[]; custom?: Record<string, unknown> }) =>
    unwrap<UseCase>(api.post(`${U(id)}/risks`, body, { silent: true })),
  updateRisk: (id: string, riskId: string, body: Record<string, unknown>) =>
    unwrap<UseCase>(api.patch(`${U(id)}/risks/${riskId}`, body, { silent: true })),
  removeRisk: (id: string, riskId: string) =>
    unwrap<UseCase>(api.delete(`${U(id)}/risks/${riskId}`, { silent: true })),
  decide: (
    id: string,
    body: { gate: Gate; role: ApproverRole; decision: 'approved' | 'rejected'; comment?: string },
  ) => unwrap<UseCase>(api.post(`${U(id)}/approvals`, body, { silent: true })),
  advance: (id: string) => unwrap<UseCase>(api.post(`${U(id)}/advance`, {}, { silent: true })),
  transition: (
    id: string,
    body: { action: 'hold' | 'resume' | 'reject' | 'retire' | 'send_back'; reason?: string },
  ) => unwrap<UseCase>(api.post(`${U(id)}/transition`, body, { silent: true })),
  attest: (id: string, note: string) =>
    unwrap<UseCase>(api.post(`${U(id)}/attest`, { confirmed: true, note }, { silent: true })),
  ingest: (id: string, records: Array<Record<string, unknown>>) =>
    unwrap<{ accepted: number; flagged: number }>(
      api.post(`${U(id)}/records`, { records }, { silent: true }),
    ),
  records: (id: string, flagged: boolean) =>
    unwrap<{ total: number; records: RecordRow[] }>(
      api.get(`${U(id)}/records`, { params: { flagged, limit: 50 }, silent: true }),
    ),
  evaluate: (id: string) => unwrap<UseCase>(api.post(`${U(id)}/evaluate`, {}, { silent: true })),
  setBaseline: (id: string) => unwrap<UseCase>(api.post(`${U(id)}/baseline`, {}, { silent: true })),
  downloadFactsheet: async (id: string, ref: string) => {
    const res = await api.get(`${U(id)}/factsheet`, { responseType: 'blob' });
    saveBlob(res.data as Blob, `${ref}-factsheet.md`);
  },
  downloadInventory: async () => {
    const res = await api.get(`${G}/export`, { responseType: 'blob' });
    saveBlob(res.data as Blob, `ai-use-cases-${new Date().toISOString().slice(0, 10)}.csv`);
  },

  issues: (params: { status?: string; useCaseId?: string }) =>
    unwrap<Issue[]>(api.get(`${G}/issues`, { params, silent: true })),
  createIssue: (body: Record<string, unknown>) =>
    unwrap<Issue>(api.post(`${G}/issues`, body, { silent: true })),
  updateIssue: (id: string, body: Record<string, unknown>) =>
    unwrap<Issue>(api.patch(`${G}/issues/${id}`, body, { silent: true })),
};

export const STAGE_LABELS: Record<Stage, string> = {
  proposed: 'Proposed',
  assessment: 'Risk assessment',
  development: 'Development',
  validation: 'Validation',
  production: 'Production',
  retired: 'Retired',
};
export const STAGE_ORDER: Stage[] = [
  'proposed',
  'assessment',
  'development',
  'validation',
  'production',
];
export const TIER_LABELS: Record<Tier, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  prohibited: 'Prohibited',
};
export const EU_LABELS: Record<EuCategory, string> = {
  prohibited: 'Prohibited',
  high: 'High-risk',
  limited: 'Limited risk',
  minimal: 'Minimal risk',
  out_of_scope: 'Out of scope',
};
export const TYPE_LABELS: Record<AiType, string> = {
  generative: 'Generative AI',
  predictive: 'Predictive model',
  agentic: 'AI agent',
  rules: 'Rules or other',
};

export const formatMetric = (r: Pick<MetricResult, 'value' | 'unit'>): string =>
  r.value == null
    ? '—'
    : r.unit === 'rate'
      ? `${Math.round(r.value * 1000) / 10}%`
      : r.unit === 'ms'
        ? `${Math.round(r.value).toLocaleString()} ms`
        : r.value.toFixed(2);

export const formatThreshold = (
  r: Pick<MetricResult, 'threshold' | 'unit' | 'direction'>,
): string =>
  `${r.direction === 'max' ? 'at most' : 'at least'} ${
    r.unit === 'rate'
      ? `${Math.round(r.threshold * 1000) / 10}%`
      : r.unit === 'ms'
        ? `${r.threshold.toLocaleString()} ms`
        : r.threshold.toFixed(2)
  }`;
