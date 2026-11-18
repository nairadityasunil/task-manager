import api from '@/services/api';

export interface PendingInvitation {
  id: string;
  token: string;
  projectId: string;
  projectName: string;
  inviterName: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  createdAt?: string;
}

export interface ProjectInvitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  createdAt?: string;
}

export const getMyInvitations = async (): Promise<PendingInvitation[]> => {
  const res = await api.get<{ data: PendingInvitation[] }>('/invitations/me');
  return res.data.data;
};

export const getProjectInvitations = async (projectId: string): Promise<ProjectInvitation[]> => {
  const res = await api.get<{ data: ProjectInvitation[] }>(`/invitations/projects/${projectId}`);
  return res.data.data;
};

export interface AcceptedInvitation {
  projectId?: string;
  workspaceId?: string | null;
  projectName?: string | null;
}

export const acceptInvitation = async (token: string): Promise<AcceptedInvitation> => {
  const res = await api.post<{ data?: AcceptedInvitation }>('/invitations/accept', { token });
  return res.data?.data ?? {};
};

export const rejectInvitation = async (token: string): Promise<void> => {
  await api.post('/invitations/reject', { token });
};

export const revokeInvitation = async (invitationId: string): Promise<void> => {
  await api.delete(`/invitations/${invitationId}`);
};

export const sendInvitation = async (
  projectId: string,
  email: string,
): Promise<void> => {
  // People are invited to a project as members only.
  await api.post(`/invitations/projects/${projectId}`, { email, role: 'MEMBER' });
};
