export type TaskWorkflowStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type TaskStatus = TaskWorkflowStatus | 'rolled_over';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskSource = 'claude' | 'chatgpt' | 'gemini' | 'manual' | 'ai-planning' | 'automation';
export type TaskSlaState = 'HEALTHY' | 'NEAR_BREACH' | 'BREACHED' | 'PAUSED' | 'COMPLETED';

export const TASK_WORKFLOW_STATUS_OPTIONS: Array<{ value: TaskWorkflowStatus; label: string }> = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'DONE', label: 'Done' }
];

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  note?: string;
  status: TaskWorkflowStatus;
  completed: boolean;
  completedAt: string | null;
  assignedToUserId: string | null;
  assignedToUser: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export interface TaskNote {
  id: string;
  /** Heading in the list of notes; the server fills it from the text for notes written without one. */
  title: string;
  /** The description: HTML from the editor, or plain text for older notes. */
  text: string;
  authorId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  note?: string;
  /** The project workflow state the task is in, when the project has states. */
  stateId?: string | null;
  /** Every note on the task, oldest first. */
  notes?: TaskNote[];
  /** The due date (YYYY-MM-DD), or null when the task has none. */
  date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  basePriority: TaskPriority;
  dynamicPriority: TaskPriority;
  urgencyScore: number;
  impactScore: number;
  dependencyWeight: number;
  dynamicPriorityScore: number;
  priorityEscalatedAt: string | null;
  priorityEscalationReason: string;
  isBlocked: boolean;
  blockedByTaskId: string | null;
  order: number;
  rolledOver: boolean;
  rolloverCount: number;
  source?: TaskSource;
  projectId: string | null;
  epicId: string | null;
  assignedTo: {
    id: string;
    email: string;
    name: string | null;
    firstName?: string;
    lastName?: string;
  };
  assignedBy: {
    id: string;
    email: string;
    name: string | null;
    firstName?: string;
    lastName?: string;
  } | null;
  assignedAt: string;
  subtasks: Subtask[];
  slaResponseDueAt: string | null;
  slaResolutionDueAt: string | null;
  responseBreached: boolean;
  resolutionBreached: boolean;
  firstResponseAt: string | null;
  completedAt: string | null;
  slaPausedAt: string | null;
  totalPausedDuration: number;
  currentSlaState: TaskSlaState;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
    canUpdate: boolean;
    canReassign: boolean;
  };
}

export interface SlaConfig {
  id: string;
  priority: TaskPriority;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

/** A project's times for one priority; `custom` is false when it uses the person's defaults. */
export interface ProjectSlaConfig extends SlaConfig {
  custom: boolean;
}

export interface SlaAnalyticsSummary {
  totalBreached: number;
  breachedByPriority: Record<TaskPriority, number>;
  averageResolutionTimeHours: number;
  responseCompliancePercent: number;
  resolutionCompliancePercent: number;
}

export interface TaskSummary {
  total: number;
  backlog: number;
  todo: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  done: number;
  rolledOver: number;
  date?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  note?: string;
  /** The due date (YYYY-MM-DD). Leave it out for a task with no due date. */
  date?: string | null;
  status?: TaskStatus;
  /** Create the task in a workflow state of its project; the status follows the state's category. */
  stateId?: string | null;
  priority?: TaskPriority;
  source?: TaskSource;
  projectId?: string | null;
  epicId?: string | null;
  assignedTo?: string;
  subtasks?: Array<{
    title: string;
    note?: string;
    status?: TaskWorkflowStatus;
    completedAt?: string | null;
    assignedToUserId?: string | null;
  }>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  note?: string;
  date?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  isBlocked?: boolean;
  blockedByTaskId?: string | null;
  order?: number;
  /** Move the task to a workflow state; the status follows the state's category. */
  stateId?: string | null;
  projectId?: string | null;
  epicId?: string | null;
  assignedTo?: string;
  subtasks?: Array<{
    title: string;
    note?: string;
    status?: TaskWorkflowStatus;
    completedAt?: string | null;
    assignedToUserId?: string | null;
  }>;
}
