import api from '@/services/api';
import type { AgentAlert, AgentKind, AgentRiskLevel, AgentStatus, UserRef } from '@/services/agents';

export type VendorStatus = 'under_review' | 'approved' | 'restricted' | 'blocked';
export type VendorCategory = 'ai_model' | 'ai_assistant' | 'automation' | 'observability' | 'communication' | 'developer_tool' | 'other';
export type VendorTier = 1 | 2 | 3;
export type EvidenceKind = 'soc2' | 'iso27001' | 'iso42001' | 'dpa' | 'pentest' | 'policy' | 'other';

export interface VendorRiskFactor {
  code: string;
  label: string;
  /** Positive adds risk; negative is a control that removes it. */
  weight: number;
  framework: string;
}

export interface Vendor {
  id: string;
  key: string;
  name: string;
  category: VendorCategory;
  website?: string | null;
  purpose?: string | null;
  ownerUserId?: string | UserRef | null;
  tier: VendorTier;
  status: VendorStatus;
  statusReason?: string | null;
  sources: string[];
  firstSeenAt: string;
  lastSeenAt?: string | null;
  dataLocation?: string | null;
  includeInSubprocessors: boolean;
  dpaExpiresAt?: string | null;
  contractRenewalAt?: string | null;
  notes?: string | null;
  answers: Record<string, string>;
  assessmentCompletedAt?: string | null;
  assessmentCompletedBy?: string | UserRef | null;
  nextReviewAt?: string | null;
  reviewDue: boolean;
  inherentRisk: number;
  residualRisk: number;
  riskLevel: AgentRiskLevel;
  riskFactors: VendorRiskFactor[];
  createdAt: string;
}

export interface VendorListItem extends Vendor {
  agentCount: number;
  evidenceCount: number;
  openAlerts: number;
  spend30d: number;
}

export interface CatalogVendor {
  key: string;
  name: string;
  category: VendorCategory;
  website: string;
  purpose: string;
}

export interface Question {
  id: string;
  section: string;
  text: string;
  type: 'yes_no' | 'select' | 'text' | 'date';
  options?: Array<{ value: string; label: string }>;
  required: boolean;
  hint?: string;
  framework: string;
}

export interface VendorEvidence {
  id: string;
  kind: EvidenceKind;
  name: string;
  contentType: string;
  size: number;
  sha256: string;
  expiresAt?: string | null;
  uploadedBy?: string | UserRef;
  createdAt: string;
}

export interface VendorHistoryEntry {
  at: string;
  by?: string | UserRef | null;
  action: string;
  from?: string | null;
  to?: string | null;
  note?: string | null;
}

export interface VendorDetail extends Vendor {
  history: VendorHistoryEntry[];
  agents: Array<{
    id: string;
    name: string;
    kind: AgentKind;
    status: AgentStatus;
    lastSeenAt?: string | null;
    callCount: number;
    riskLevel: AgentRiskLevel;
  }>;
  webhooks: Array<{ id: string; name: string; url: string; enabled: boolean }>;
  evidence: VendorEvidence[];
  alerts: AgentAlert[];
  spend30d: number;
  questionnaire: { version: number; questions: Question[]; missing: string[] };
  reviewCadenceMonths: number;
}

export interface VendorUpdate {
  name?: string;
  website?: string | null;
  purpose?: string | null;
  dataLocation?: string | null;
  notes?: string | null;
  category?: VendorCategory;
  tier?: VendorTier;
  ownerUserId?: string | null;
  dpaExpiresAt?: string | null;
  contractRenewalAt?: string | null;
  includeInSubprocessors?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

const ws = (workspaceId?: string | null) => (workspaceId ? { workspaceId } : {});
const unwrap = <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> => promise.then((res) => res.data.data);

export const vendorsApi = {
  list: (workspaceId?: string | null) => unwrap<VendorListItem[]>(api.get('/vendors', { params: ws(workspaceId) })),
  catalog: (workspaceId?: string | null) => unwrap<CatalogVendor[]>(api.get('/vendors/catalog', { params: ws(workspaceId), silent: true })),
  create: (body: { key?: string; name?: string; category?: VendorCategory; website?: string }, workspaceId?: string | null) =>
    unwrap<Vendor>(api.post('/vendors', { ...body, ...ws(workspaceId) })),
  get: (vendorId: string, workspaceId?: string | null) => unwrap<VendorDetail>(api.get(`/vendors/${vendorId}`, { params: ws(workspaceId) })),
  update: (vendorId: string, body: VendorUpdate, workspaceId?: string | null) =>
    unwrap<Vendor>(api.patch(`/vendors/${vendorId}`, { ...body, ...ws(workspaceId) })),
  remove: (vendorId: string, workspaceId?: string | null) => unwrap<unknown>(api.delete(`/vendors/${vendorId}`, { params: ws(workspaceId) })),
  setStatus: (vendorId: string, status: VendorStatus, reason?: string, workspaceId?: string | null) =>
    unwrap<Vendor>(api.post(`/vendors/${vendorId}/status`, { status, reason, ...ws(workspaceId) })),
  saveAssessment: (vendorId: string, answers: Record<string, string>, complete: boolean, workspaceId?: string | null) =>
    unwrap<Vendor>(api.put(`/vendors/${vendorId}/assessment`, { answers, complete, ...ws(workspaceId) })),
  uploadEvidence: (vendorId: string, file: File, kind: EvidenceKind, expiresAt: string | null, workspaceId?: string | null) =>
    unwrap<VendorEvidence>(
      api.post(`/vendors/${vendorId}/evidence`, file, {
        params: { kind, name: file.name, expiresAt: expiresAt || undefined, ...ws(workspaceId) },
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      })
    ),
  downloadEvidence: async (vendorId: string, evidenceId: string, workspaceId?: string | null) => {
    const res = await api.get(`/vendors/${vendorId}/evidence/${evidenceId}`, {
      params: ws(workspaceId),
      responseType: 'blob'
    });
    return res.data as Blob;
  },
  deleteEvidence: (vendorId: string, evidenceId: string, workspaceId?: string | null) =>
    unwrap<unknown>(api.delete(`/vendors/${vendorId}/evidence/${evidenceId}`, { params: ws(workspaceId) })),
  exportRegister: async (format: 'csv' | 'json', workspaceId?: string | null) => {
    const res = await api.get('/vendors/export', {
      params: { format, ...ws(workspaceId) },
      responseType: 'blob'
    });
    return res.data as Blob;
  },
  exportSubprocessors: async (format: 'csv' | 'json', workspaceId?: string | null) => {
    const res = await api.get('/vendors/subprocessors', {
      params: { format, ...ws(workspaceId) },
      responseType: 'blob'
    });
    return res.data as Blob;
  }
};

/* -------------------------------- Labels -------------------------------- */

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  under_review: 'Under review',
  approved: 'Approved',
  restricted: 'Restricted',
  blocked: 'Blocked'
};

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  ai_model: 'AI model provider',
  ai_assistant: 'AI assistant',
  automation: 'Automation',
  observability: 'Security and monitoring',
  communication: 'Communication',
  developer_tool: 'Developer tool',
  other: 'Other'
};

export const TIER_LABELS: Record<VendorTier, string> = {
  1: 'Tier 1 · critical',
  2: 'Tier 2 · important',
  3: 'Tier 3 · low impact'
};

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  soc2: 'SOC 2 report',
  iso27001: 'ISO/IEC 27001 certificate',
  iso42001: 'ISO/IEC 42001 certificate',
  dpa: 'Data processing agreement',
  pentest: 'Penetration test',
  policy: 'Policy',
  other: 'Other'
};

export const SOURCE_LABELS: Record<string, string> = {
  ai_provider: 'AI provider',
  mcp_client: 'MCP client',
  chatgpt: 'ChatGPT',
  detected: 'Unregistered agent',
  webhook: 'Webhook',
  manual: 'Added by hand'
};

/** What the status means for its agents. */
export const VENDOR_STATUS_EFFECTS: Record<VendorStatus, string> = {
  under_review: 'Its agents keep working while you review it. With "approved vendors only" on, they can only read and AI calls to it are refused.',
  approved: 'Its agents work under your policies.',
  restricted: 'Its agents can read but not change anything; AI calls to it are refused.',
  blocked: 'Its agents are refused and webhooks to it are not sent.'
};

/** Accepted evidence file types (the server checks the content too). */
export const EVIDENCE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,.csv';

/** Saves a blob as a file. */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
