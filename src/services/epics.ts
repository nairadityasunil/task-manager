import api from '@/services/api';
import type { CreateEpicInput, Epic, UpdateEpicInput } from '@/types/epic';

interface EpicListResponse {
  message: string;
  data: {
    epics: Epic[];
  };
}

interface EpicResponse {
  message: string;
  data: {
    epic: Epic;
  };
}

interface ReorderEpicsResponse {
  message: string;
  data: {
    epics: Epic[];
  };
}

const getEpics = async (projectId: string): Promise<Epic[]> => {
  const response = await api.get<EpicListResponse>(`/projects/${projectId}/epics`);
  return response.data.data.epics;
};

/** The epics of every project the person belongs to, in one request (the server knows which projects those are). */
/** `workspaceId` limits the list to the epics of that workspace's projects. `projectId` narrows it to one project. */
const getMyEpics = async (workspaceId?: string, projectId?: string): Promise<Epic[]> => {
  const params: Record<string, string> = {};
  if (workspaceId) params.workspaceId = workspaceId;
  if (projectId) params.projectId = projectId;
  const response = await api.get<EpicListResponse>('/epics', {
    params: Object.keys(params).length ? params : undefined,
  });
  return response.data.data.epics;
};

const createEpic = async (projectId: string, payload: CreateEpicInput): Promise<Epic> => {
  const response = await api.post<EpicResponse>(`/projects/${projectId}/epics`, payload);
  return response.data.data.epic;
};

const updateEpic = async (projectId: string, epicId: string, payload: UpdateEpicInput): Promise<Epic> => {
  const response = await api.patch<EpicResponse>(`/projects/${projectId}/epics/${epicId}`, payload);
  return response.data.data.epic;
};

const deleteEpic = async (projectId: string, epicId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}/epics/${epicId}`);
};

const reorderEpics = async (projectId: string, epicIds: string[]): Promise<Epic[]> => {
  const response = await api.patch<ReorderEpicsResponse>(`/projects/${projectId}/epics/reorder`, { epicIds });
  return response.data.data.epics;
};

export { createEpic, deleteEpic, getEpics, getMyEpics, reorderEpics, updateEpic };
