import { FileText } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import type { Subtask, Task } from '@/types/task';

interface TaskNotesListProps {
  noteType?: 'all' | 'subtask' | 'task';
  onOpenSubtaskNote: (task: Task, subtask: Subtask) => void;
  onOpenTaskNote: (task: Task) => void;
  tasks: Task[];
}

interface TaskNoteEntry {
  id: string;
  kind: 'task' | 'subtask';
  label: string;
  note: string;
  onOpen: () => void;
}

const buildEntries = (
  noteType: 'all' | 'subtask' | 'task',
  tasks: Task[],
  onOpenTaskNote: (task: Task) => void,
  onOpenSubtaskNote: (task: Task, subtask: Subtask) => void
): TaskNoteEntry[] =>
  tasks.flatMap((task) => {
    const entries: TaskNoteEntry[] = [];

    if (noteType !== 'subtask' && task.note?.trim()) {
      entries.push({
        id: `task-${task.id}`,
        kind: 'task',
        label: task.title,
        note: task.note,
        onOpen: () => onOpenTaskNote(task)
      });
    }

    task.subtasks.forEach((subtask) => {
      if (noteType === 'task') {
        return;
      }

      if (!subtask.note?.trim()) {
        return;
      }

      entries.push({
        id: `subtask-${task.id}-${subtask.id}`,
        kind: 'subtask',
        label: `${task.title} / ${subtask.title}`,
        note: subtask.note,
        onOpen: () => onOpenSubtaskNote(task, subtask)
      });
    });

    return entries;
  });

function TaskNotesList({
  noteType = 'all',
  onOpenSubtaskNote,
  onOpenTaskNote,
  tasks
}: TaskNotesListProps): JSX.Element {
  const entries = buildEntries(noteType, tasks, onOpenTaskNote, onOpenSubtaskNote);

  if (entries.length === 0) {
    return (
      <EmptyState
        compact
        description={
          noteType === 'task'
            ? 'Task notes will appear here after you add them from any task.'
            : noteType === 'subtask'
              ? 'Sub-task notes will appear here after you add them from any sub-task.'
              : 'Notes will appear here after you add them to tasks or sub-tasks.'
        }
        icon={FileText}
        title={
          noteType === 'task'
            ? 'No task notes yet'
            : noteType === 'subtask'
              ? 'No sub-task notes yet'
              : 'No notes yet'
        }
      />
    );
  }

  return (
    <div className="max-h-[520px] divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 bg-white">
      {entries.map((entry) => (
        <article key={entry.id}>
          <button
            className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            onClick={entry.onOpen}
            type="button"
          >
            <span className="flex w-full min-w-0 items-center gap-2">
              <strong className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{entry.label}</strong>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {entry.kind === 'task' ? 'Task note' : 'Subtask note'}
              </span>
            </span>
            <span className="w-full truncate text-[13px] text-slate-500">
              {entry.note.replace(/<[^>]+>/g, ' ').trim() || 'Open note'}
            </span>
          </button>
        </article>
      ))}
    </div>
  );
}

export default TaskNotesList;