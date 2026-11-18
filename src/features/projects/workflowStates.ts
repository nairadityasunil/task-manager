import type { ProjectState } from '@/services/projectStates';
import type { Task, TaskWorkflowStatus } from '@/types/task';

/** A state's category decides the built-in status, exactly as the server does, so the two always agree. */
export const statusOfCategory = (category: ProjectState['category']): TaskWorkflowStatus =>
  category === 'BACKLOG' ? 'BACKLOG' : category === 'UNSTARTED' ? 'TODO' : category === 'STARTED' ? 'IN_PROGRESS' : 'DONE';

const categoryOfStatus = (status: string): ProjectState['category'] =>
  status === 'BACKLOG' ? 'BACKLOG' : status === 'DONE' ? 'COMPLETED' : status === 'TODO' || status === 'rolled_over' ? 'UNSTARTED' : 'STARTED';

export const sortStates = (states: ProjectState[]): ProjectState[] => states.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

/**
 * The workflow state a task is in. A task without one (made before the project had states, or whose state
 * was deleted) sits in the first state of its status's category, so no task disappears from the board.
 */
export function stateForTask(task: Pick<Task, 'stateId' | 'status'>, states: ProjectState[]): ProjectState | null {
  if (!states.length) return null;
  const direct = task.stateId ? states.find((s) => s._id === task.stateId) : undefined;
  if (direct) return direct;
  const category = categoryOfStatus(task.status);
  const ordered = sortStates(states);
  return (
    ordered.find((s) => s.category === category) ??
    // No state of that kind: open work sits in the first column, finished work in the last.
    (category === 'COMPLETED' ? (ordered.find((s) => s.category === 'CANCELED') ?? ordered[ordered.length - 1]) : ordered[0]) ??
    null
  );
}
