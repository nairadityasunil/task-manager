import { TaskActivity } from './TaskActivity';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  AlertCircle,
  Zap,
  Clock,
} from 'lucide-react';
import { TASK_WORKFLOW_STATUS_OPTIONS } from '@/types/task';
import type { ProjectState } from '@/services/projectStates';
import { stateForTask } from '@/features/projects/workflowStates';
import type {
  Task,
  Subtask,
  TaskWorkflowStatus,
  TaskPriority,
  UpdateTaskInput,
} from '@/types/task';
import type { ProjectMember } from '@/types/project';
import AssigneeSelector from '@/components/AssigneeSelector';
import UserAvatar from '@/components/UserAvatar';
import SlaIndicator from '@/components/SlaIndicator';
import SourceBadge from '@/components/SourceBadge';
import ApprovalSection from '@/components/ApprovalSection';
import { ClassificationSelect } from '@/features/agents/components/AdvancedGovernance';
import CommentSection from '@/components/CommentSection';
import { TaskAutomationNote } from '@/features/telemetry/TaskAutomationNote';
import { TaskNotes } from './TaskNotes';
import { PRIORITY_META, PriorityIcon, taskDateInfo } from '@/components/TaskCard';
import { Badge, Button, cn, selectClass, Select, Checkbox } from '@/components/ui';

export interface TaskInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: ProjectMember[];
  sidePanelTab: 'subtasks' | 'comments';
  setSidePanelTab: (tab: 'subtasks' | 'comments') => void;
  setSubtaskModalTask: (task: Task | null) => void;
  handleUpdateSubtaskStatus: (
    task: Task,
    subtask: Subtask,
    status: TaskWorkflowStatus,
  ) => Promise<void> | void;
  handleToggleBlocked: (task: Task) => void;
  handleEvaluatePriority: (taskId: string) => Promise<void> | void;
  isEvaluatingPriority: boolean;
  onViewSubtasks: (task: Task) => void;
  onNotesChanged: () => void;
  /** The task's project workflow states: when there are some, the Status dropdown lists them. */
  states?: ProjectState[];
  onMoveToState?: (task: Task, stateId: string) => void;
  statesLoading?: boolean;
  handleUpdateTaskField: (taskId: string, updates: UpdateTaskInput) => Promise<void> | void;
}

const tabCls = (active: boolean) =>
  cn(
    '-mb-px border-b-2 pb-3 pt-3 text-sm font-medium transition-colors',
    active ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800',
  );

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="m-0 flex min-h-9 min-w-0 flex-wrap items-center gap-2">{children}</dd>
    </div>
  );
}

function DetailRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className={cn('m-0 text-right text-[13px] tabular-nums text-slate-700', className)}>{children}</dd>
    </div>
  );
}

export function TaskInspector({
  isOpen,
  onClose,
  task,
  members,
  sidePanelTab,
  setSidePanelTab,
  setSubtaskModalTask,
  handleUpdateSubtaskStatus,
  handleToggleBlocked,
  handleEvaluatePriority,
  isEvaluatingPriority,
  onViewSubtasks,
  onNotesChanged,
  states = [],
  onMoveToState,
  statesLoading = false,
  handleUpdateTaskField,
}: TaskInspectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!task) return null;

  const completedSubtasks = task.subtasks.filter(s => s.status === 'DONE').length;
  const dynamicMeta = task.dynamicPriority ? PRIORITY_META[task.dynamicPriority] : null;
  const dateInfo = taskDateInfo(task);
  const subtaskPct = task.subtasks.length ? Math.round((completedSubtasks / task.subtasks.length) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[5000] bg-slate-900/30 xl:hidden"
          />

          {/* Drawer container */}
          <motion.div
            ref={containerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-[5001] flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl sm:w-[480px] xl:w-[440px] xl:shadow-none"
            role="dialog"
            aria-modal="true"
            aria-label={task.title}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 px-4 pt-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Task</span>
                    {dynamicMeta && (
                      <Badge
                        tone={task.dynamicPriority === 'CRITICAL' || task.dynamicPriority === 'HIGH' ? 'danger' : task.dynamicPriority === 'MEDIUM' ? 'warning' : 'neutral'}
                        title="Dynamic priority"
                      >
                        <PriorityIcon priority={task.dynamicPriority} size={12} />
                        {dynamicMeta.label}
                      </Badge>
                    )}
                  </div>
                  <h3 className="m-0 text-lg font-semibold leading-snug tracking-tight text-slate-900 line-clamp-3">
                    {task.title}
                  </h3>
                </div>
                <Button
                  aria-label="Close inspector"
                  className="-mr-1.5 -mt-1"
                  icon={X}
                  onClick={onClose}
                  size="icon-sm"
                  title="Close inspector"
                  variant="ghost"
                />
              </div>

              {/* Subtask & Comments tab switcher */}
              <div className="mt-3 flex gap-5">
                <button
                  onClick={() => setSidePanelTab('subtasks')}
                  className={tabCls(sidePanelTab === 'subtasks')}
                  type="button"
                >
                  Subtasks & Specs
                </button>
                <button
                  onClick={() => setSidePanelTab('comments')}
                  className={tabCls(sidePanelTab === 'comments')}
                  type="button"
                >
                  Comments ({task.subtasks.length ? 'Live' : '0'})
                </button>
              </div>
            </div>

            {/* Main content drawer container */}
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-white px-4 py-5 custom-scrollbar sm:px-5">
              {sidePanelTab === 'subtasks' ? (
                <div className="flex flex-col gap-6">
                  {/* Properties */}
                  <dl className="m-0 grid gap-1.5">
                    <PropertyRow label="Status">
                      <div className="w-40" data-testid="drawer-status">
                        {statesLoading ? (
                          <Select aria-label="Status" disabled onChange={() => undefined} value="">
                            <option value="">Loading…</option>
                          </Select>
                        ) : states.length && onMoveToState ? (
                          <Select
                            aria-label="Status"
                            onChange={(e) => onMoveToState(task, e.target.value)}
                            value={stateForTask(task, states)?._id ?? ''}
                          >
                            {states.map((st) => (
                              <option key={st._id} value={st._id}>{st.name}</option>
                            ))}
                          </Select>
                        ) : (
                          <Select
                            aria-label="Status"
                            onChange={(e) => {
                              void handleUpdateTaskField(task.id, { status: e.target.value as TaskWorkflowStatus });
                            }}
                            value={task.status === 'rolled_over' ? 'TODO' : task.status}
                          >
                            {TASK_WORKFLOW_STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </Select>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleBlocked(task)}
                        className={cn(
                          'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors',
                          task.isBlocked
                            ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
                        )}
                      >
                        <AlertCircle size={12} /> {task.isBlocked ? 'Unblock Task' : 'Block Task'}
                      </button>
                    </PropertyRow>
                    <PropertyRow label="Assignee">
                      <AssigneeSelector
                        projectId={task.projectId || null}
                        selectedUserId={task.assignedTo?.id || ''}
                        onSelect={(userId) => {
                          void handleUpdateTaskField(task.id, { assignedTo: userId });
                        }}
                        className="w-full"
                      />
                    </PropertyRow>
                    <PropertyRow label="Priority">
                      <Select
                        aria-label="Priority"
                        value={task.priority || 'MEDIUM'}
                        onChange={(e) => {
                          void handleUpdateTaskField(task.id, {
                            priority: e.target.value as TaskPriority,
                          });
                        }}
                        className={cn(selectClass, 'cursor-pointer')}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </Select>
                    </PropertyRow>
                    {dateInfo && (
                      <PropertyRow label="Date">
                        <span className={cn('text-sm', dateInfo.overdue ? 'text-red-600' : 'text-slate-700')}>{dateInfo.label}</span>
                      </PropertyRow>
                    )}
                    <PropertyRow label="SLA">
                      <SlaIndicator task={task} compact />
                    </PropertyRow>
                    <PropertyRow label="Source">
                      <SourceBadge source={task.source} />
                    </PropertyRow>
                    {task.projectId ? (
                      <PropertyRow label="Data label">
                        <ClassificationSelect compact inherit taskId={task.id} />
                      </PropertyRow>
                    ) : null}
                  </dl>

                  {task.source === 'automation' ? <TaskAutomationNote onOpenSource={onClose} taskId={task.id} /> : null}

                  {task.description && (
                    <section>
                      <h4 className="m-0 mb-1.5 text-[13px] font-medium text-slate-500">Description</h4>
                      <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-slate-700">{linkify(task.description)}</p>
                    </section>
                  )}

                  {/* Subtask list */}
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="m-0 text-[15px] font-semibold text-slate-900">
                        Sub-tasks <span className="font-normal tabular-nums text-slate-500">({completedSubtasks}/{task.subtasks.length})</span>
                      </h4>
                      <Button
                        aria-label="New Subtask"
                        disabled={!task.permissions.canUpdate}
                        icon={Plus}
                        onClick={() => setSubtaskModalTask(task)}
                        size="icon-sm"
                        title="New Subtask"
                        variant="secondary"
                      />
                    </div>
                    {task.subtasks.length > 0 && (
                      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${subtaskPct}%` }} />
                      </div>
                    )}

                    {task.subtasks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-[13px] text-slate-500">
                        No subtasks added. Click "+" to create one.
                      </div>
                    ) : (
                      <>
                        <ul className="m-0 list-none divide-y divide-slate-100 rounded-lg border border-slate-200 p-0" data-testid="subtasks-preview">
                          {task.subtasks.slice(0, 3).map((subtask) => (
                            <li className="flex items-center gap-3 px-3 py-2" key={subtask.id}>
                              <Checkbox
                                aria-label={`Mark ${subtask.title} as ${subtask.status === 'DONE' ? 'not done' : 'done'}`}
                                checked={subtask.status === 'DONE'}
                                className="shrink-0"
                                disabled={!task.permissions.canUpdate}
                                onChange={() => void handleUpdateSubtaskStatus(task, subtask, subtask.status === 'DONE' ? 'TODO' : 'DONE')}
                              />
                              <span className={cn('min-w-0 flex-1 truncate text-sm', subtask.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-900')}>{subtask.title}</span>
                              {subtask.assignedToUser ? <UserAvatar email={subtask.assignedToUser.email} name={subtask.assignedToUser.name} size="sm" /> : null}
                            </li>
                          ))}
                        </ul>
                        <Button data-testid="view-all-subtasks" onClick={() => onViewSubtasks(task)} variant="secondary">
                          {task.subtasks.length > 3 ? `View all ${task.subtasks.length} subtasks` : 'Open subtasks'}
                        </Button>
                      </>
                    )}
                  </section>

                  {/* SLA timers and details */}
                  <section className="rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                      <Clock size={16} className="text-slate-400" />
                      <h4 className="m-0 text-[15px] font-semibold text-slate-900">Response and resolution times</h4>
                    </div>
                    <div className="px-4 pb-4 pt-3">
                      <SlaIndicator task={task} />
                      <dl className="m-0 mt-3 divide-y divide-slate-100">
                        <DetailRow label="Response target due">
                          {task.slaResponseDueAt
                            ? new Date(task.slaResponseDueAt).toLocaleString()
                            : 'Not configured'}
                        </DetailRow>
                        <DetailRow label="Resolution target due">
                          {task.slaResolutionDueAt
                            ? new Date(task.slaResolutionDueAt).toLocaleString()
                            : 'Not configured'}
                        </DetailRow>
                        <DetailRow className={task.firstResponseAt ? 'text-emerald-700' : 'text-slate-400'} label="First response">
                          {task.firstResponseAt
                            ? new Date(task.firstResponseAt).toLocaleString()
                            : 'Awaiting action'}
                        </DetailRow>
                        <DetailRow className={task.completedAt ? 'text-emerald-700' : 'text-slate-400'} label="Completed at">
                          {task.completedAt
                            ? new Date(task.completedAt).toLocaleString()
                            : 'Not yet'}
                        </DetailRow>
                        <DetailRow className={task.slaPausedAt ? 'text-amber-700' : 'text-slate-700'} label="Timer">
                          {task.slaPausedAt
                            ? `Paused on ${new Date(task.slaPausedAt).toLocaleDateString()}`
                            : 'Running'}
                        </DetailRow>
                        <DetailRow className="font-medium text-slate-900" label="Priority score">
                          {dynamicMeta?.label ?? task.dynamicPriority} · {task.dynamicPriorityScore}
                        </DetailRow>
                        <DetailRow label="Effect on other work">
                          {task.dependencyWeight ? `Blocks ${task.dependencyWeight} ${task.dependencyWeight === 1 ? 'task' : 'tasks'}` : 'Blocks nothing'} · impact {task.impactScore}
                        </DetailRow>
                      </dl>
                      {task.priorityEscalationReason && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                          <span className="mb-0.5 block text-[13px] font-medium text-red-700">
                            Escalation Trigger
                          </span>
                          <p className="m-0 text-[13px] leading-relaxed text-red-700/90">
                            {task.priorityEscalationReason}
                          </p>
                        </div>
                      )}

                      <Button
                        className="mt-4 w-full"
                        disabled={isEvaluatingPriority}
                        icon={Zap}
                        loading={isEvaluatingPriority}
                        onClick={() => void handleEvaluatePriority(task.id)}
                        size="sm"
                        variant="secondary"
                      >
                        {isEvaluatingPriority
                          ? 'Calculating priorities...'
                          : 'Evaluate Dynamic Priority'}
                      </Button>
                    </div>
                  </section>

                  {/* Notes: a task can have several */}
                  <TaskNotes members={members} onChanged={onNotesChanged} task={task} />

                  {/* Who changed it, including AI agents */}
                  {task.projectId ? (
                    <TaskActivity
                      entityIds={[task.id, ...task.subtasks.map((subtask) => subtask.id)]}
                      projectId={task.projectId}
                      refreshKey={`${task.status}-${task.title}-${task.subtasks.map((subtask) => subtask.status).join()}`}
                    />
                  ) : null}

                  {/* Approvals */}
                  {task.projectId ? (
                    <ApprovalSection
                      projectId={task.projectId}
                      taskId={task.id}
                      members={members}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[350px] flex-1 flex-col">
                  <CommentSection taskId={task.id} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default TaskInspector;

/** Makes web addresses in a description clickable. Only http and https are linked. */
function linkify(text: string): Array<string | JSX.Element> {
  return text.split(/(https?:\/\/[^\s<>"']+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        className="break-all text-brand-600 underline hover:text-brand-700"
        href={part}
        key={i}
        rel="noopener noreferrer"
        target="_blank"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}
