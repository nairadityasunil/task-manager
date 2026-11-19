import api from '@/services/api';
import type { ProjectSlaConfig, SlaAnalyticsSummary, SlaConfig, TaskPriority } from '@/types/task';

interface SlaConfigListResponse {
  message: string;
  data: {
    configs: SlaConfig[];
  };
}

interface SlaConfigResponse {
  message: string;
  data: {
    config: SlaConfig;
  };
}

interface SlaAnalyticsResponse {
  message: string;
  data: {
    summary: SlaAnalyticsSummary;
  };
}

const getSlaConfigs = async (): Promise<SlaConfig[]> => {
  const response = await api.get<SlaConfigListResponse>('/sla/config');
  return response.data.data.configs;
};

const updateSlaConfig = async (payload: {
  priority: TaskPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
}): Promise<SlaConfig> => {
  const response = await api.patch<SlaConfigResponse>('/sla/config', payload);
  return response.data.data.config;
};

/** SLA numbers for one project, or one workspace, or (with no scope) everything the person can see. */
const getSlaAnalytics = async (scope: { projectId?: string; workspaceId?: string } = {}): Promise<SlaAnalyticsSummary> => {
  const response = await api.get<SlaAnalyticsResponse>('/sla/analytics', {
    params: { projectId: scope.projectId || undefined, workspaceId: scope.workspaceId || undefined },
    silent: true
  });
  return response.data.data.summary;
};

const getProjectSla = async (projectId: string): Promise<{ enabled: boolean; configs: ProjectSlaConfig[] }> => {
  const response = await api.get<{ data: { enabled: boolean; configs: ProjectSlaConfig[] } }>(`/sla/projects/${projectId}/config`);
  return response.data.data;
};

/** Project admins turn SLA tracking for a project on or off. */
const setProjectSlaEnabled = async (projectId: string, enabled: boolean): Promise<boolean> => {
  const response = await api.patch<{ data: { enabled: boolean } }>(`/sla/projects/${projectId}/enabled`, { enabled });
  return response.data.data.enabled;
};

const updateProjectSlaConfig = async (
  projectId: string,
  payload: { priority: TaskPriority; responseTimeHours: number; resolutionTimeHours: number }
): Promise<ProjectSlaConfig> => {
  const response = await api.patch<{ data: { config: ProjectSlaConfig } }>(`/sla/projects/${projectId}/config`, payload);
  return response.data.data.config;
};

const resetProjectSlaConfig = async (projectId: string, priority: TaskPriority): Promise<void> => {
  await api.delete(`/sla/projects/${projectId}/config/${priority}`);
};

export { getProjectSla, getSlaAnalytics, getSlaConfigs, resetProjectSlaConfig, setProjectSlaEnabled, updateProjectSlaConfig, updateSlaConfig };
