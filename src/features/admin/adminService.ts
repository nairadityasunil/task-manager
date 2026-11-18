import api from '@/services/api';

export type AccountStatus = 'active' | 'suspended' | 'deleted';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  authProvider: 'local' | 'google';
  status: AccountStatus;
  isSuperAdmin: boolean;
  /** "settings" when granted by the server's SUPER_ADMIN_EMAILS, "database" when promoted in the panel. */
  superAdminSource: 'settings' | 'database' | null;
  twoFactorEnabled: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string | null;
  workspaces: number;
  projects: number;
  lastActiveAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  firstName: string | null;
  lastName: string | null;
  passwordChangedAt: string | null;
  memberships: {
    workspaces: Array<{ id: string; name: string; role: string }>;
    projects: Array<{ id: string; name: string; role: string }>;
  };
  sessions: Array<{ id: string; deviceType: string; deviceName: string | null; userAgent: string | null; createdAt: string | null; lastUsedAt: string | null; expiresAt: string; active: boolean }>;
  stats: { tasksCreated: number; tasksAssigned: number; invitationsSent: number; aiRuns: number; aiTokens: number; aiCost: number; aiErrors: number };
  audit: Array<{ id: string; action: string; actorEmail: string; details: Record<string, unknown>; createdAt: string }>;
}

export interface Paged {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserQuery {
  q?: string;
  status?: string;
  role?: string;
  provider?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export interface AdminWorkspaceRow {
  id: string;
  name: string;
  slug: string;
  owner: { id: string; email: string; name: string | null } | null;
  members: number;
  projects: number;
  createdAt: string | null;
}

export interface AdminWorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string | null;
  members: Array<{ userId: string; role: string; email: string; name: string | null; status: AccountStatus }>;
  projects: Array<{ id: string; name: string; tasks: number; createdAt: string | null }>;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface Analytics {
  days: number;
  from: string;
  to: string;
  totals: {
    users: number; activeUsers: number; suspendedUsers: number; deletedUsers: number; superAdmins: number; newUsers: number;
    workspaces: number; projects: number; tasks: number; tasksDone: number; prompts: number; aiRunsAllTime: number; agents: number;
  };
  engagement: { dau: number; wau: number; mau: number; stickiness: number };
  security: { twoFactorEnabled: number; twoFactorShare: number; googleSignIn: number; passwordSignIn: number };
  invitations: { PENDING: number; ACCEPTED: number; REJECTED: number; acceptanceRate: number | null };
  ai: {
    runs: number; errors: number; errorRate: number; tokens: number; cost: number;
    providers: Array<{ provider: string; model: string; runs: number; errors: number; tokens: number; cost: number; avgLatencyMs: number }>;
    sources: Array<{ source: string; runs: number }>;
    topWorkspaces: Array<{ id: string; name: string; runs: number; cost: number; tokens: number }>;
  };
  tasks: { done: number; completionRate: number; byStatus: Array<{ status: string; count: number }>; byPriority: Array<{ priority: string; count: number }> };
  agentKinds: Array<{ kind: string; count: number }>;
  topWorkspaces: Array<{ id: string; name: string; members: number }>;
  series: {
    days: string[]; signups: number[]; activeUsers: number[]; tasksCreated: number[]; projectsCreated: number[];
    aiRuns: number[]; aiErrors: number[]; aiCost: number[]; aiTokens: number[];
  };
}

export interface EmailTemplateVariable {
  key: string;
  description: string;
  sample: string;
}

export interface EmailTemplate {
  code: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  variables: EmailTemplateVariable[];
  isActive: boolean;
  /** False for emails people need to sign in: they cannot be switched off. */
  canDisable: boolean;
  updatedAt: string | null;
}

const get = async <T>(path: string, params?: object): Promise<T> => (await api.get<{ data: T }>(`/admin${path}`, { params })).data.data;
const post = async <T>(path: string, body?: object): Promise<T> => (await api.post<{ data: T }>(`/admin${path}`, body ?? {})).data.data;

export const adminApi = {
  analytics: (days: number) => get<Analytics>('/analytics', { days }),
  users: (query: UserQuery) => get<{ users: AdminUserRow[] } & Paged>('/users', query),
  user: (id: string) => get<AdminUserDetail>(`/users/${id}`),
  createUser: (body: { email: string; name?: string; password?: string; superAdmin?: boolean }) => post<{ user: AdminUserRow; temporaryPassword: string | null }>('/users', body),
  updateUser: async (id: string, body: { name?: string; email?: string }) => (await api.patch<{ data: AdminUserRow }>(`/admin/users/${id}`, body)).data.data,
  suspend: (id: string, reason?: string) => post<AdminUserRow>(`/users/${id}/suspend`, { reason }),
  reactivate: (id: string) => post<AdminUserRow>(`/users/${id}/reactivate`),
  makeSuperAdmin: (id: string) => post<AdminUserRow>(`/users/${id}/make-super-admin`),
  removeSuperAdmin: (id: string) => post<AdminUserRow>(`/users/${id}/remove-super-admin`),
  resetPassword: (id: string) => post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
  disableTwoFactor: (id: string) => post<AdminUserRow>(`/users/${id}/disable-2fa`),
  signOut: (id: string) => post<{ revoked: number }>(`/users/${id}/sign-out`),
  deleteUser: async (id: string, confirmEmail: string) => (await api.delete(`/admin/users/${id}`, { data: { confirmEmail } })).data,
  workspaces: (query: { q?: string; page?: number; limit?: number }) => get<{ workspaces: AdminWorkspaceRow[] } & Paged>('/workspaces', query),
  workspace: (id: string) => get<AdminWorkspaceDetail>(`/workspaces/${id}`),
  audit: (query: { q?: string; action?: string; page?: number; limit?: number }) => get<{ entries: AuditEntry[] } & Paged>('/audit', query),
  emailTemplates: () => get<EmailTemplate[]>('/email-templates'),
  updateEmailTemplate: async (code: string, body: { name?: string; subject?: string; html?: string; isActive?: boolean }) =>
    (await api.patch<{ data: { template: EmailTemplate; unknownVariables: string[] } }>(`/admin/email-templates/${code}`, body)).data.data,
  resetEmailTemplate: (code: string) => post<EmailTemplate>(`/email-templates/${code}/reset`),
  previewEmailTemplate: (code: string, draft: { subject?: string; html?: string }) =>
    post<{ subject: string; html: string; unknownVariables: string[] }>(`/email-templates/${code}/preview`, draft),
  testEmailTemplate: (code: string, body: { to: string; subject?: string; html?: string }) =>
    post<{ message: string }>(`/email-templates/${code}/test`, body),
};
