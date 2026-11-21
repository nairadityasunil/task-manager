export type ProjectFeature = 'team' | 'time' | 'prompts' | 'aiPlanner';
export type ProjectPermissions = Record<ProjectFeature, boolean>;

/** Shown in settings: what each switch lets a member do. */
export const PROJECT_FEATURE_INFO: Record<ProjectFeature, { label: string; hint: string }> = {
  team: { label: 'Team management', hint: 'Add and remove people on the project' },
  time: { label: 'Time management', hint: 'Log time and see the weekly timesheet' },
  prompts: { label: 'Prompt access', hint: 'Browse and run deployed prompts in this project' },
  aiPlanner: { label: 'AI planner access', hint: 'Use the AI planner for this project' },
};

export const PROJECT_FEATURES = Object.keys(PROJECT_FEATURE_INFO) as ProjectFeature[];

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  workspaceId?: string;
  isCollaborator?: boolean;
  currentUserRole: 'ADMIN' | 'MEMBER';
  /** What the signed-in person may use here. Admins have everything. */
  currentUserPermissions?: ProjectPermissions;
  /** False when a project admin has turned SLA tracking off for the project. */
  slaEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  creator?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface ProjectTransferRequest {
  id: string;
  token: string;
  projectId: string;
  projectName: string;
  projectDescription?: string;
  currentOwnerName: string;
  currentOwnerEmail: string;
  targetEmail: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt?: string;
  expiresAt: string;
}

export interface ProjectMemberUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  permissions?: ProjectPermissions;
  createdAt?: string;
  user: ProjectMemberUser;
}

export interface UserSearchResult {
  id: string;
  email: string;
  name: string | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}
