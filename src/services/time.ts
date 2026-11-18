import api from '@/services/api';

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  taskId: string | null;
  taskTitle: string | null;
  date: string;
  minutes: number;
  note: string;
}

export interface TimeWeek {
  weekStart: string;
  days: string[];
  scope: 'me' | 'all';
  entries: TimeEntry[];
  totals: Array<{ userId: string; userName: string; minutes: number }>;
  tasks: Array<{ id: string; title: string; estimatedHours: number | null }>;
}

type Envelope<T> = { data: T };

export const getTimeWeek = async (projectId: string, params: { start?: string; scope?: 'all'; userId?: string }): Promise<TimeWeek> => {
  const res = await api.get<Envelope<TimeWeek>>(`/projects/${projectId}/time/week`, { params });
  return res.data.data;
};

export const addTimeEntry = async (
  projectId: string,
  entry: { date: string; minutes: number; taskId?: string | null; note?: string; userId?: string }
): Promise<void> => {
  await api.post(`/projects/${projectId}/time/entries`, entry);
};

export const updateTimeEntry = async (projectId: string, entryId: string, patch: { minutes?: number; date?: string; note?: string }): Promise<void> => {
  await api.patch(`/projects/${projectId}/time/entries/${entryId}`, patch);
};

export const deleteTimeEntry = async (projectId: string, entryId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}/time/entries/${entryId}`);
};
