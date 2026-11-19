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

const getSlaAnalytics = async (): Promise<SlaAnalyticsSummary> => {
  const response = await api.get<SlaAnalyticsResponse>('/sla/analytics');
  return response.data.data.summary;
};

const getProjectSlaConfigs = async (projectId: string): Promise<ProjectSlaConfig[]> => {
  const response = await api.get<{ data: { configs: ProjectSlaConfig[] } }>(`/sla/projects/${projectId}/config`);
  return response.data.data.configs;
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

export { getProjectSlaConfigs, getSlaAnalytics, getSlaConfigs, resetProjectSlaConfig, updateProjectSlaConfig, updateSlaConfig };
