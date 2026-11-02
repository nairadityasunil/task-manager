import { AlertCircle, ArrowDown, ArrowUp, CalendarDays, FilePenLine, ListChecks, Loader2, MessageSquare, Minus, Siren, Trash2 } from 'lucide-react';

import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import {
  TASK_WORKFLOW_STATUS_OPTIONS,
  type Subtask,
  type Task,
  type TaskWorkflowStatus,
  type TaskPriority
} from '@/types/task';
import { StatusIcon, cn, type BadgeTone, Checkbox } from '@/components/ui';
import UserAvatar from './UserAvatar';
import SlaIndicator from './SlaIndicator';

interface TaskCardProps {
  actionTaskId?: string | null;
  availableEpics?: Epic[];
  onCreateSubtask?: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDeleteSubtask?: (task: Task, subtask: Subtask) => void;
  onEditTask?: (task: Task) => void;
  onEditSubtask?: (task: Task, subtask: Subtask) => void;
  onOpenEpicNotes?: (epic: Epic) => void;
  onOpenProjectNotes?: (project: Project) => void;
  onOpenSubtaskNote?: (task: Task, subtask: Subtask) => void;
  onOpenTaskNote?: (task: Task) => void;
  onUpdateEpic?: (task: Task, epicId: string | null) => void;
  onUpdateStatus?: (task: Task, status: TaskWorkflowStatus) => void;
  onUpdateSubtaskStatus?: (task: Task, subtask: Subtask, status: TaskWorkflowStatus) => void;
  epicName?: string;
  projectName?: string;
  task: Task;
  onSelect?: (task: Task) => void;
  onComment?: (task: Task) => void;
  onToggleBlocked?: (task: Task) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
  /** `row` is the dense list layout, `card` the kanban card. */
  variant?: 'row' | 'card';
}

/* ---------- Shared task display helpers (also used by the inspector) ---------- */

export const TASK_STATUS_TONE: Record<string, BadgeTone> = {
  BACKLOG: 'neutral',
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  IN_REVIEW: 'warning',
  BLOCKED: 'danger',
  DONE: 'success',
  rolled_over: 'neutral'
};

/** Dot colour for a workflow status (kanban column headers, compact markers). */
export const TASK_STATUS_DOT: Record<string, string> = {
  BACKLOG: 'bg-slate-300',
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-sky-500',
  IN_REVIEW: 'bg-amber-500',
  BLOCKED: 'bg-red-500',
  DONE: 'bg-emerald-500',
  rolled_over: 'bg-slate-300'
};

export function taskStatusLabel(status: string): string {
  if (status === 'rolled_over') return 'Rolled over';
  return TASK_WORKFLOW_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status.replace(/_/g, ' ');
}

export const PRIORITY_META: Record<TaskPriority, { label: string; icon: typeof Siren; className: string }> = {
  CRITICAL: { label: 'Critical', icon: Siren, className: 'text-red-600' },
  HIGH: { label: 'High', icon: ArrowUp, className: 'text-red-500' },
  MEDIUM: { label: 'Medium', icon: Minus, className: 'text-amber-500' },
  LOW: { label: 'Low', icon: ArrowDown, className: 'text-slate-400' }
};

export function PriorityIcon({ priority, size = 14 }: { priority: TaskPriority; size?: number }): JSX.Element | null {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span aria-label={`${meta.label} priority`} className={cn('inline-flex shrink-0', meta.className)} role="img" title={`${meta.label} priority`}>
      <Icon size={size} strokeWidth={2.25} />
    </span>
  );
}

const parseTaskDate = (value: string): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Short date label ("Oct 21") and whether it is in the past for an unfinished task. */
export function taskDateInfo(task: Pick<Task, 'date' | 'status'>): { label: string; overdue: boolean } | null {
  const date = parseTaskDate(task.date);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sameYear = date.getFullYear() === today.getFullYear();
  return {
    label: date.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }),
    overdue: date < today && task.status !== 'DONE'
  };
}

/* ---------- Component ---------- */

const actionBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15';

function TaskCard({
  actionTaskId,
  onDelete,
  onEditTask,
  task,
  onSelect,
  onComment,
  onToggleBlocked,
  isSelected,
  isMultiSelected,
  onToggleSelection,
  variant = 'card'
}: TaskCardProps): JSX.Element {
  const completedSubtasksCount = task.subtasks.filter((subtask) => subtask.status === 'DONE').length;
  const isUpdating = actionTaskId === task.id;
  const breached = task.responseBreached || task.resolutionBreached;
  const dateInfo = taskDateInfo(task);
  const isDone = task.status === 'DONE';

  const checkbox = onToggleSelection ? (
    <Checkbox
      aria-label={`Select ${task.title}`}
      checked={isMultiSelected} className="shrink-0"
      onChange={(e) => {
        e.stopPropagation();
        onToggleSelection(task.id);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  ) : null;

  const actions = (
    <div
      className={cn(
        'flex items-center gap-0.5 transition-opacity',
        // In the wide single-line row, float the actions over the meta column so they don't steal title space.
        variant === 'row' &&
          '@3xl:[@media(hover:hover)]:absolute @3xl:[@media(hover:hover)]:right-12 @3xl:[@media(hover:hover)]:top-1/2 @3xl:[@media(hover:hover)]:-translate-y-1/2 @3xl:[@media(hover:hover)]:rounded-lg @3xl:[@media(hover:hover)]:bg-slate-50 @3xl:[@media(hover:hover)]:pl-2',
        // Hover-capable devices reveal actions on hover/focus; touch devices always see them.
        '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100',
        isSelected && '[@media(hover:hover)]:opacity-100'
      )}
    >
      {onEditTask && (
        <button
          className={actionBtn}
          disabled={!task.permissions.canEdit}
          onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
          title="Edit Task"
          type="button"
        >
          <FilePenLine size={15} />
        </button>
      )}
      {onToggleBlocked && (
        <button
          className={cn(actionBtn, task.isBlocked ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'hover:text-red-600')}
          disabled={!task.permissions.canEdit}
          onClick={(e) => { e.stopPropagation(); onToggleBlocked(task); }}
          title={task.isBlocked ? 'Unblock Task' : 'Block Task'}
          type="button"
        >
          <AlertCircle size={15} />
        </button>
      )}
      <button
        className={actionBtn}
        onClick={(e) => { e.stopPropagation(); onComment?.(task); }}
        title="Add Comment"
        type="button"
      >
        <MessageSquare size={15} />
      </button>
      <button
        className={cn(actionBtn, 'hover:bg-red-50 hover:text-red-600')}
        disabled={!task.permissions.canDelete}
        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        title="Delete Task"
        type="button"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  const avatar = (
    <UserAvatar email={task.assignedTo?.email ?? ''} name={task.assignedTo?.name ?? null} size="sm" />
  );

  const subtaskMeta = task.subtasks.length > 0 ? (
    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-slate-500" title="Subtasks completed">
      <ListChecks className="text-slate-400" size={13} />
      {completedSubtasksCount}/{task.subtasks.length}
    </span>
  ) : null;

  const dateMeta = dateInfo ? (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs', dateInfo.overdue ? 'text-red-600' : 'text-slate-500')} title="Date">
      <CalendarDays className={dateInfo.overdue ? 'text-red-500' : 'text-slate-400'} size={13} />
      {dateInfo.label}
    </span>
  ) : null;

  const blockedMarker = task.isBlocked ? (
    <span className="inline-flex shrink-0 text-red-500" title={task.blockedByTaskId ? `Blocked by task ${task.blockedByTaskId}` : 'Blocked'}>
      <AlertCircle size={14} />
    </span>
  ) : null;

  const updatingOverlay = isUpdating ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/60">
      <Loader2 className="animate-spin text-slate-500" size={16} />
    </div>
  ) : null;

  if (variant === 'row') {
    const statusText =
      task.isBlocked && !isDone ? (
        <span className="text-[13px] text-amber-800">Blocked</span>
      ) : (
        <span className={cn('text-[13px]', task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW' ? 'text-brand-700' : 'text-slate-600')}>
          {taskStatusLabel(task.status)}
        </span>
      );
    return (
      <article
        className={cn(
          'group relative flex items-center gap-3 border-b border-slate-100 px-3 py-2 transition-colors last:border-b-0 sm:px-4',
          isSelected ? 'bg-brand-50' : 'hover:bg-slate-50',
          isUpdating ? 'cursor-wait opacity-60' : 'cursor-pointer'
        )}
        data-testid="task-row"
        onClick={() => !isUpdating && onSelect?.(task)}
      >
        {updatingOverlay}
        {checkbox}
        <StatusIcon status={task.isBlocked && !isDone ? 'BLOCKED' : task.status} />

        <div className="flex min-w-0 flex-1 flex-col gap-1 @3xl:flex-row @3xl:items-center @3xl:gap-4">
          {/* Title */}
          <div className="flex min-h-7 min-w-0 flex-1 items-center gap-2">
            <h3 className={cn('m-0 min-w-0 text-[13px] font-normal leading-5 line-clamp-2 @3xl:line-clamp-none @3xl:truncate', isDone ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900')}>
              {task.title}
            </h3>
            {subtaskMeta}
            {task.isBlocked && task.blockedByTaskId ? (
              <span className="hidden shrink-0 text-xs text-amber-800 @xl:inline" title={`Blocked by task ${task.blockedByTaskId}`}>
                Waiting on another task
              </span>
            ) : null}
          </div>

          {/* Meta + actions */}
          <div className="flex min-w-0 flex-nowrap items-center gap-x-3 @3xl:shrink-0">
            {/* Fixed widths on wide rows keep the meta columns aligned between rows. */}
            <span className="flex items-center @3xl:w-[92px]">{statusText}</span>
            <span className="hidden items-center @lg:flex @3xl:w-[112px]">
              <SlaIndicator compact task={task} />
            </span>
            <span className="hidden items-center gap-1 @md:flex @3xl:w-[76px]" title={`${PRIORITY_META[task.priority]?.label ?? task.priority} priority`}>
              <PriorityIcon priority={task.priority} size={13} />
              <span className="text-xs text-slate-600">{PRIORITY_META[task.priority]?.label ?? task.priority}</span>
            </span>
            {dateMeta ? <span className="flex items-center @3xl:w-[64px]">{dateMeta}</span> : null}
            <div className="ml-auto flex items-center gap-1 @3xl:ml-0">
              {actions}
              {avatar}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-2.5 rounded-lg border bg-white p-3 transition-colors',
        isSelected ? 'border-brand-600 ring-1 ring-brand-600' : breached ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-slate-300',
        isUpdating ? 'cursor-wait opacity-60' : 'cursor-pointer'
      )}
      onClick={() => !isUpdating && onSelect?.(task)}
    >
      {updatingOverlay}

      <div className="flex items-start gap-2">
        {checkbox ? <div className="flex h-5 items-center">{checkbox}</div> : null}
        <div className="flex h-5 items-center">
          <PriorityIcon priority={task.priority} />
        </div>
        <h3 className="m-0 min-w-0 flex-1 text-sm font-medium leading-5 text-slate-900 line-clamp-2">{task.title}</h3>
        {blockedMarker}
      </div>

      {task.description ? (
        <p className="m-0 text-[13px] leading-snug text-slate-500 line-clamp-2">{task.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <SlaIndicator compact task={task} />
        {dateMeta}
        {subtaskMeta}
      </div>

      <div className="-mb-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="-ml-1.5">{actions}</div>
        {avatar}
      </div>
    </article>
  );
}

export default TaskCard;
