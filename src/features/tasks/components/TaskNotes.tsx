import { ChevronRight, NotebookPen } from 'lucide-react';
import { useState } from 'react';

import { richToPlainText } from '@/components/rich-text/richText';
import type { ProjectMember } from '@/types/project';
import type { Task } from '@/types/task';

import { TaskNotesModal } from './TaskNotesModal';

interface Props {
  task: Task;
  members: ProjectMember[];
  /** Reload the task list after a change. */
  onChanged: () => void;
}

/** One row in the task drawer: how many notes, the newest one's title, and a click opens all of them in a dialog. */
export function TaskNotes({ task, members, onChanged }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const notes = task.notes ?? [];
  const latest = notes.length ? notes[notes.length - 1] : null;

  return (
    <section data-testid="task-notes">
      <button
        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
        data-testid="task-notes-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <NotebookPen className="shrink-0 text-slate-500" size={16} />
        <span className="shrink-0 text-[15px] font-semibold text-slate-900">
          Notes <span className="font-normal tabular-nums text-slate-500">({notes.length})</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[13px] text-slate-500">
          {latest ? latest.title || richToPlainText(latest.text) : 'Add the first note'}
        </span>
        <ChevronRight className="shrink-0 text-slate-400" size={16} />
      </button>
      {open ? <TaskNotesModal members={members} onChanged={onChanged} onClose={() => setOpen(false)} task={task} /> : null}
    </section>
  );
}
