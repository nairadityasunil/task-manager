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

/**
 * The epics of several projects in one request (the dashboard shows a page of projects). Falls back to one
 * request per project if the server does not have the batch endpoint yet.
 */
const getEpicsForProjects = async (projectIds: string[]): Promise<Epic[]> => {
  if (projectIds.length === 0) return [];
  try {
    const response = await api.get<EpicListResponse>('/epics', { params: { projectIds: projectIds.join(',') } });
    return response.data.data.epics;
  } catch {
    const lists = await Promise.allSettled(projectIds.map((id) => getEpics(id)));
    return lists.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  }
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

export { createEpic, deleteEpic, getEpics, getEpicsForProjects, reorderEpics, updateEpic };
