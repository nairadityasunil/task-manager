import { Edit3, FileText, ListChecks, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import Modal from '@/components/Modal';
import SubtaskInlineEdit from '@/components/SubtaskInlineEdit';
import UserAvatar from '@/components/UserAvatar';
import { Button, Checkbox, Input, cn } from '@/components/ui';
import type { ProjectMember } from '@/types/project';
import type { Subtask, Task, TaskWorkflowStatus } from '@/types/task';

interface Props {
  task: Task;
  members: ProjectMember[];
  isUpdating: boolean;
  editingSubtask: { task: Task; subtask: Subtask } | null;
  setEditingSubtask: (state: { task: Task; subtask: Subtask } | null) => void;
  onClose: () => void;
  onAddSubtask: (task: Task) => void;
  onUpdateStatus: (task: Task, subtask: Subtask, status: TaskWorkflowStatus) => Promise<void> | void;
  onUpdateSubtask: (
    task: Task,
    subtask: Subtask,
    patch: { title: string; description?: string; note?: string; assignedToUserId?: string | null }
  ) => Promise<void> | void;
  onDeleteSubtask: (task: Task, subtaskId: string) => Promise<void> | void;
  onOpenSubtaskNote: (task: Task, subtask: Subtask) => void;
}

type Filter = 'all' | 'open' | 'done';

/** Every subtask of a task in a floating window, with search, a filter, and full editing. */
export function SubtasksModal({
  task,
  members,
  isUpdating,
  editingSubtask,
  setEditingSubtask,
  onClose,
  onAddSubtask,
  onUpdateStatus,
  onUpdateSubtask,
  onDeleteSubtask,
  onOpenSubtaskNote,
}: Props): JSX.Element {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const done = task.subtasks.filter((s) => s.status === 'DONE').length;
  const pct = task.subtasks.length ? Math.round((done / task.subtasks.length) * 100) : 0;
  const canUpdate = task.permissions.canUpdate;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return task.subtasks.filter((s) => {
      if (filter === 'open' && s.status === 'DONE') return false;
      if (filter === 'done' && s.status !== 'DONE') return false;
      return !needle || s.title.toLowerCase().includes(needle) || (s.description ?? '').toLowerCase().includes(needle);
    });
  }, [task.subtasks, filter, query]);

  return (
    <Modal
      description={`${done} of ${task.subtasks.length} done`}
      maxWidth="max-w-[680px]"
      onClose={onClose}
      title={
        <span className="flex min-w-0 items-center gap-2">
          <ListChecks aria-hidden className="shrink-0 text-slate-500" size={18} />
          <span className="truncate">Sub-tasks: {task.title}</span>
        </span>
      }
    >
      <div className="grid gap-3" data-testid="subtasks-modal">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" title={`${pct}% done`}>
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-40 flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input aria-label="Search subtasks" className="pl-8" onChange={(e) => setQuery(e.target.value)} placeholder="Search subtasks" value={query} />
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[13px]" role="group" aria-label="Filter subtasks">
            {(['all', 'open', 'done'] as const).map((value) => (
              <button
                aria-pressed={filter === value}
                className={cn('rounded-md px-2.5 py-1 font-medium capitalize transition-colors', filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
          <Button disabled={!canUpdate} icon={Plus} onClick={() => onAddSubtask(task)} variant="primary">
            Add subtask
          </Button>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-500">
            {task.subtasks.length === 0 ? 'No subtasks yet. Add the first one.' : 'No subtask matches.'}
          </div>
        ) : (
          <ul className="m-0 max-h-[55vh] list-none divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 p-0" data-testid="subtasks-list">
            {shown.map((subtask) => {
              const editing = editingSubtask?.task.id === task.id && editingSubtask?.subtask.id === subtask.id;
              return (
                <li className="group px-3 py-2.5 transition-colors hover:bg-slate-50/70" data-testid="subtask-row" key={subtask.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox
                        aria-label={`Mark ${subtask.title} as ${subtask.status === 'DONE' ? 'not done' : 'done'}`}
                        checked={subtask.status === 'DONE'}
                        className="mt-0.5 shrink-0"
                        disabled={!canUpdate}
                        onChange={() => void onUpdateStatus(task, subtask, subtask.status === 'DONE' ? 'TODO' : 'DONE')}
                      />
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className={cn('text-sm leading-5', subtask.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-900')}>{subtask.title}</span>
                        {!editing && subtask.description ? <p className="m-0 text-xs leading-relaxed text-slate-500">{subtask.description}</p> : null}
                        {!editing && subtask.note ? (
                          <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                            <MessageSquare className="shrink-0 text-slate-400" size={12} />
                            <span className="truncate">{subtask.note}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <div className="flex items-center">
                        <button
                          aria-label="Edit subtask"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                          disabled={!canUpdate}
                          onClick={() => setEditingSubtask(editing ? null : { task, subtask })}
                          type="button"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button aria-label="Subtask note" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => onOpenSubtaskNote(task, subtask)} type="button">
                          <FileText size={13} />
                        </button>
                        <button
                          aria-label="Delete subtask"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          disabled={!canUpdate}
                          onClick={() => void onDeleteSubtask(task, subtask.id)}
                          type="button"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {subtask.assignedToUser ? <UserAvatar email={subtask.assignedToUser.email} name={subtask.assignedToUser.name} size="sm" /> : null}
                    </div>
                  </div>
                  {editing ? (
                    <SubtaskInlineEdit isSaving={isUpdating} members={members} onCancel={() => setEditingSubtask(null)} onSave={(patch) => void onUpdateSubtask(task, subtask, patch)} subtask={subtask} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
