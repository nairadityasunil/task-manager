import api from '@/services/api';
import type {
  CreateProjectInput,
  Project,
  ProjectMember,
  ProjectPermissions,
  UpdateProjectInput
} from '@/types/project';

export interface ProjectsPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Only the projects in this workspace. */
  workspaceId?: string;
}

interface ProjectListResponse {
  message: string;
  data: {
    projects: Project[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProjectResponse {
  message: string;
  data: {
    project: Project;
  };
}

interface ProjectMembersResponse {
  message: string;
  data: {
    members: ProjectMember[];
  };
}

const getProjects = async (params?: ProjectsPaginationParams): Promise<ProjectListResponse['data']> => {
  const response = await api.get<ProjectListResponse>('/projects', { params });
  return response.data.data;
};

const getProject = async (projectId: string): Promise<Project> => {
  const response = await api.get<ProjectResponse>(`/projects/${projectId}`);
  return response.data.data.project;
};

/** Every project the person belongs to (the list is paged, so this reads all pages). */
const getAllProjects = async (search?: string, workspaceId?: string): Promise<Project[]> => {
  const all: Project[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const data = await getProjects({ page, limit: 100, search: search?.trim() || undefined, workspaceId });
    all.push(...data.projects);
    if (page >= data.totalPages) break;
  }
  return all;
};

const createProject = async (payload: CreateProjectInput): Promise<Project> => {
  const response = await api.post<ProjectResponse>('/projects', payload);
  return response.data.data.project;
};

const updateProject = async (projectId: string, payload: UpdateProjectInput): Promise<Project> => {
  const response = await api.patch<ProjectResponse>(`/projects/${projectId}`, payload);
  return response.data.data.project;
};

const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`);
};

const deleteProjects = async (projectIds: string[]): Promise<void> => {
  await api.post('/projects/bulk-delete', { projectIds });
};

const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const response = await api.get<ProjectMembersResponse>(`/projects/${projectId}/members`);
  return response.data.data.members;
};

const addProjectMember = async (projectId: string, userId: string): Promise<ProjectMember> => {
  const response = await api.post<{ message: string; data: { member: ProjectMember } }>(
    `/projects/${projectId}/members`,
    { userId }
  );
  return response.data.data.member;
};

const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}/members/${userId}`);
};

const updateMemberPermissions = async (
  projectId: string,
  userId: string,
  permissions: Partial<ProjectPermissions>
): Promise<ProjectMember> => {
  const response = await api.patch<{ message: string; data: { member: ProjectMember } }>(
    `/projects/${projectId}/members/${userId}/permissions`,
    permissions
  );
  return response.data.data.member;
};

const leaveProject = async (projectId: string): Promise<void> => {
  await api.post(`/projects/${projectId}/leave`);
};

export {
  addProjectMember,
  createProject,
  deleteProject,
  deleteProjects,
  getAllProjects,
  getProject,
  getProjectMembers,
  getProjects,
  leaveProject,
  updateMemberPermissions,
  removeProjectMember,
  updateProject
};
