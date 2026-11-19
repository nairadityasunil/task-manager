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

/** A person's own time across all their projects for one week. */
export interface MyWeek {
  weekStart: string;
  days: string[];
  /** Only projects with time that week, the most time first. */
  projects: Array<{ projectId: string; name: string; minutes: number; byDay: number[] }>;
  totalMinutes: number;
  totalByDay: number[];
  /** Every workspace the person is in (even with no time) and any other they logged time in, with the projects that have time. */
  workspaces: Array<{
    workspaceId: string | null;
    name: string;
    minutes: number;
    projects: Array<{ projectId: string; name: string; minutes: number; byDay: number[] }>;
  }>;
}

type Envelope<T> = { data: T };

export const getMyWeek = async (start?: string): Promise<MyWeek> => {
  const res = await api.get<Envelope<MyWeek>>('/time/my-week', { params: { start } });
  return res.data.data;
};

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

export const getTimeRange = async (
  projectId: string,
  params: { from: string; to: string; scope?: 'all' },
): Promise<{ from: string; to: string; scope: 'me' | 'all'; entries: TimeEntry[] }> => {
  const res = await api.get<Envelope<{ from: string; to: string; scope: 'me' | 'all'; entries: TimeEntry[] }>>(`/projects/${projectId}/time/range`, { params });
  return res.data.data;
};
