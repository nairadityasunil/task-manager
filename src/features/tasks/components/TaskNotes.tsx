import { NotebookPen, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button, Textarea } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { addTaskNote, deleteTaskNote, updateTaskNote } from '@/services/tasks';
import type { ProjectMember } from '@/types/project';
import type { Task } from '@/types/task';
import { toDisplayErrorMessage } from '@/utils/apiError';

interface Props {
  task: Task;
  members: ProjectMember[];
  /** Reload the task list after a change. */
  onChanged: () => void;
}

const when = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/** A task can have several notes. Add as many as you need; edit or delete your own. */
export function TaskNotes({ task, members, onChanged }: Props): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const notes = task.notes ?? [];
  const nameOf = (id: string | null): string => {
    if (!id) return 'Someone';
    const m = members.find((x) => x.userId === id);
    return id === user?.id ? 'You' : (m?.user.name || m?.user.email || 'A former member');
  };
  const canTouch = (authorId: string | null): boolean => task.permissions.canEdit || (!!authorId && authorId === user?.id);

  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      onChanged();
      return true;
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3" data-testid="task-notes">
      <h4 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
        <NotebookPen className="text-slate-500" size={16} /> Notes <span className="font-normal tabular-nums text-slate-500">({notes.length})</span>
      </h4>
      {notes.length ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {notes.map((n) => (
            <li className="rounded-lg border border-slate-200 bg-white p-3" data-testid="task-note" key={n.id}>
              {editing?.id === n.id ? (
                <div className="grid gap-2">
                  <Textarea aria-label="Note text" onChange={(e) => setEditing({ id: n.id, text: e.target.value })} rows={3} value={editing.text} />
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setEditing(null)} size="sm" variant="secondary">
                      Cancel
                    </Button>
                    <Button
                      disabled={!editing.text.trim()}
                      loading={busy}
                      onClick={() => void run(() => updateTaskNote(task.id, n.id, editing.text)).then((ok) => ok && setEditing(null))}
                      size="sm"
                      variant="primary"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{n.text}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {nameOf(n.authorId)}
                      {n.createdAt ? ` · ${when(n.createdAt)}` : ''}
                    </span>
                    {canTouch(n.authorId) ? (
                      <span className="flex items-center gap-1">
                        <button aria-label="Edit note" className="grid h-6 w-6 place-items-center rounded-md hover:bg-slate-100 hover:text-slate-800" onClick={() => setEditing({ id: n.id, text: n.text })} type="button">
                          <Pencil size={12} />
                        </button>
                        <button aria-label="Delete note" className="grid h-6 w-6 place-items-center rounded-md hover:bg-red-50 hover:text-red-600" disabled={busy} onClick={() => void run(() => deleteTaskNote(task.id, n.id))} type="button">
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-lg border border-dashed border-slate-200 px-4 py-4 text-center text-[13px] text-slate-500">No notes yet.</p>
      )}
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) void run(() => addTaskNote(task.id, draft)).then((ok) => ok && setDraft(''));
        }}
      >
        <Textarea aria-label="New note" onChange={(e) => setDraft(e.target.value)} placeholder="Add a note" rows={2} value={draft} />
        <div className="flex justify-end">
          <Button disabled={!draft.trim() || !task.permissions.canUpdate} loading={busy} type="submit" variant="primary">
            Add note
          </Button>
        </div>
      </form>
    </section>
  );
}
