import api from '@/services/api';
import { saveBlob } from '@/services/vendors';

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> =>
  promise.then((res) => res.data.data);

export type ToolStatus = 'unreviewed' | 'sanctioned' | 'restricted' | 'prohibited' | 'dismissed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Source =
  | 'network'
  | 'oauth'
  | 'cloud'
  | 'code'
  | 'extension'
  | 'expense'
  | 'declared'
  | 'agent';

export const SOURCE_LABELS: Record<Source, string> = {
  network: 'Network logs',
  oauth: 'OAuth grants',
  cloud: 'Cloud inventory',
  code: 'Code scan',
  extension: 'Browser extensions',
  expense: 'Expenses',
  declared: 'Declared by staff',
  agent: 'Agents',
};

export const STATUS_LABELS: Record<ToolStatus, string> = {
  unreviewed: 'Needs review',
  sanctioned: 'Sanctioned',
  restricted: 'Restricted',
  prohibited: 'Prohibited',
  dismissed: 'Not AI / ignore',
};

export const DATA_TYPES: Array<{ id: string; label: string }> = [
  { id: 'public', label: 'Public information' },
  { id: 'internal', label: 'Internal documents' },
  { id: 'customer', label: 'Customer data' },
  { id: 'personal', label: 'Personal data' },
  { id: 'source_code', label: 'Source code' },
  { id: 'financial', label: 'Financial data' },
  { id: 'health', label: 'Health data' },
  { id: 'credentials', label: 'Passwords or keys' },
];

export interface ShadowTool {
  id: string;
  toolKey: string;
  name: string;
  vendor: string;
  kind: string;
  kindLabel: string;
  catalog: boolean;
  status: ToolStatus;
  decidedByName: string;
  decidedAt: string | null;
  reason: string;
  conditions: string;
  alternative: string;
  useCaseId: string | null;
  vendorId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  users: number;
  sources: Source[];
  bytesOut: number;
  uploads: number;
  personalShare: number;
  hasSecret: boolean;
  hasBroadGrant: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  domains: string[];
}

export interface ShadowToolDetail extends ShadowTool {
  factors: Array<{ label: string; points: number }>;
  history: Array<{ at: string; byName: string; action: string; detail: string }>;
  sightings: Array<{
    user: string;
    source: Source;
    count: number;
    bytesOut: number;
    uploads: number;
    personal: boolean;
    detail: string;
    firstAt: string;
    lastAt: string;
    broad: boolean;
    secret: boolean;
  }>;
}

export interface ShadowSettings {
  amnestyUntil: string | null;
  amnestyActive: boolean;
  coachMessage: string;
  reviewDays: number;
}

export interface ShadowOverview {
  totals: {
    tools: number;
    unreviewed: number;
    unreviewedShare: number;
    peopleOnUnsanctioned: number;
    prohibitedInUse: number;
    keysInCode: number;
    openRequests: number;
  };
  byStatus: Record<string, number>;
  byKind: Record<string, number>;
  coverage: Record<string, number>;
  meanDaysToDecision: number | null;
  oldestUnreviewedDays: number;
  newPerWeek: Array<{ weekEnding: string; found: number }>;
  topRisks: ShadowTool[];
  settings: ShadowSettings;
  sourcesConnected: string[];
}

export interface ShadowRequest {
  id: string;
  userName: string;
  isMine: boolean;
  toolKey: string;
  toolName: string;
  toolId: string | null;
  toolStatus: ToolStatus;
  kind: 'declared' | 'request';
  purpose: string;
  dataTypes: string[];
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  amnesty: boolean;
  decidedByName: string;
  decidedAt: string | null;
  decisionNote: string;
  createdAt: string;
}

export interface ShadowToken {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ShadowConnector {
  id: string;
  type: 'google_workspace' | 'microsoft_entra';
  name: string;
  account: string;
  lastSyncAt: string | null;
  lastStatus: 'ok' | 'error' | 'never';
  lastError: string;
  lastUsers: number;
  lastSignals: number;
  lastTruncated: boolean;
}

export interface ImportResult {
  received: number;
  ignored: number;
  matched: number;
  newTools: number;
  tools: number;
  unreadable?: number;
}

export interface ScanResult {
  files: number;
  packages: number;
  keys: number;
  newTools: number;
  findings: Array<{
    type: 'package' | 'key';
    path: string;
    line: number;
    tool: string;
    package?: string;
    preview?: string;
  }>;
}

const S = '/shadow-ai';

export const shadowApi = {
  catalog: () =>
    unwrap<{ tools: Array<{ key: string; name: string; vendor: string; kind: string }> }>(
      api.get(`${S}/catalog`, { silent: true }),
    ),
  overview: () => unwrap<ShadowOverview>(api.get(`${S}/overview`, { silent: true })),
  tools: (params: { status?: string; q?: string }) =>
    unwrap<ShadowTool[]>(api.get(`${S}/tools`, { params, silent: true })),
  tool: (id: string) => unwrap<ShadowToolDetail>(api.get(`${S}/tools/${id}`, { silent: true })),
  decide: (id: string, body: Record<string, unknown>) =>
    unwrap<ShadowTool>(api.post(`${S}/tools/${id}/decision`, body)),
  reopen: (id: string, reason: string) =>
    unwrap<ShadowTool>(api.post(`${S}/tools/${id}/reopen`, { reason })),
  importLog: (text: string) => unwrap<ImportResult>(api.post(`${S}/import/log`, { text })),
  scan: (files: Array<{ path: string; content: string }>, repo: string) =>
    unwrap<ScanResult>(api.post(`${S}/scan`, { files, repo })),
  connectors: () => unwrap<ShadowConnector[]>(api.get(`${S}/connectors`, { silent: true })),
  addConnector: (body: Record<string, unknown>) =>
    unwrap<ShadowConnector>(api.post(`${S}/connectors`, body)),
  syncConnector: (id: string) => unwrap<ShadowConnector>(api.post(`${S}/connectors/${id}/sync`)),
  removeConnector: (id: string) =>
    unwrap<{ removed: boolean }>(api.delete(`${S}/connectors/${id}`)),
  runCheck: () => unwrap<{ alerts: number; tasks: number }>(api.post(`${S}/monitor/run`)),
  settings: () => unwrap<ShadowSettings>(api.get(`${S}/settings`, { silent: true })),
  updateSettings: (
    body: Partial<{ amnestyUntil: string | null; coachMessage: string; reviewDays: number }>,
  ) => unwrap<ShadowSettings>(api.patch(`${S}/settings`, body)),
  tokens: () => unwrap<ShadowToken[]>(api.get(`${S}/tokens`, { silent: true })),
  createToken: (name: string) =>
    unwrap<{ id: string; name: string; prefix: string; token: string; note: string }>(
      api.post(`${S}/tokens`, { name }),
    ),
  revokeToken: (id: string) => unwrap<{ revoked: boolean }>(api.delete(`${S}/tokens/${id}`)),
  requests: (status?: string) =>
    unwrap<ShadowRequest[]>(api.get(`${S}/requests`, { params: { status }, silent: true })),
  declare: (body: Record<string, unknown>) =>
    unwrap<{
      id: string;
      amnesty: boolean;
      message: string;
      tool: {
        name: string;
        status: ToolStatus;
        conditions: string;
        alternative: string;
        reason: string;
      } | null;
    }>(api.post(`${S}/requests`, body)),
  decideRequest: (id: string, decision: 'approved' | 'rejected', note: string) =>
    unwrap<{ id: string; status: string }>(
      api.post(`${S}/requests/${id}/decision`, { decision, note }),
    ),
  withdraw: (id: string) => unwrap<{ id: string }>(api.post(`${S}/requests/${id}/withdraw`)),
  downloadPolicy: async (format: 'json' | 'csv' | 'blocklist') => {
    const res = await api.get(`${S}/policy`, { params: { format }, responseType: 'blob' });
    const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
    saveBlob(
      res.data as Blob,
      `shadow-ai-${format === 'blocklist' ? 'blocklist' : 'policy'}.${ext}`,
    );
  },
};
