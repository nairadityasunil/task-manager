import { ArrowLeft, ChevronLeft, ChevronRight, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { RichTextView } from '@/components/rich-text/RichTextView';
import { isRichEmpty } from '@/components/rich-text/richText';
import { Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { addTaskNote, deleteTaskNote, updateTaskNote } from '@/services/tasks';
import type { ProjectMember } from '@/types/project';
import type { Task, TaskNote } from '@/types/task';
import { toDisplayErrorMessage } from '@/utils/apiError';

interface Props {
  task: Task;
  members: ProjectMember[];
  onClose: () => void;
  /** Reload the task list after a change. */
  onChanged: () => void;
}

const PAGE_SIZE = 10;

type View = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'form'; id: string | null };

const when = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

/**
 * All the notes of a task. The list shows only the titles; a click opens the note with its description, and from there
 * it can be edited (title and rich text description) or deleted.
 */
export function TaskNotesModal({ task, members, onClose, onChanged }: Props): JSX.Element {
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [notes, setNotes] = useState<TaskNote[]>(task.notes ?? []);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  // The task was reloaded elsewhere (someone else added a note): show it.
  useEffect(() => {
    setNotes(task.notes ?? []);
  }, [task.notes]);

  const nameOf = (id: string | null): string => {
    if (!id) return 'Someone';
    const m = members.find((x) => x.userId === id);
    return id === user?.id ? 'You' : m?.user.name || m?.user.email || 'A former member';
  };
  const canTouch = (note: TaskNote): boolean => task.permissions.canEdit || (!!note.authorId && note.authorId === user?.id);
  const meta = (note: TaskNote): string => [nameOf(note.authorId), when(note.createdAt)].filter(Boolean).join(' · ');

  const current = view.kind === 'detail' ? notes.find((n) => n.id === view.id) : view.kind === 'form' && view.id ? notes.find((n) => n.id === view.id) : undefined;

  // A note that no longer exists (deleted here or elsewhere): back to the list.
  useEffect(() => {
    if ((view.kind === 'detail' || (view.kind === 'form' && view.id)) && !notes.some((n) => n.id === view.id)) setView({ kind: 'list' });
  }, [notes, view]);

  const openForm = (note: TaskNote | null): void => {
    setTitle(note?.title ?? '');
    setText(note?.text ?? '');
    setView({ kind: 'form', id: note?.id ?? null });
  };

  const save = async (): Promise<void> => {
    if (!title.trim() || isRichEmpty(text)) return;
    setBusy(true);
    try {
      const editingId = view.kind === 'form' ? view.id : null;
      const updated = editingId ? await updateTaskNote(task.id, editingId, text, title.trim()) : await addTaskNote(task.id, text, title.trim());
      const list = updated.notes ?? [];
      setNotes(list);
      onChanged();
      const target = editingId ?? list[list.length - 1]?.id;
      setView(target ? { kind: 'detail', id: target } : { kind: 'list' });
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (note: TaskNote): Promise<void> => {
    const sure = await confirm({ title: 'Delete this note?', message: `"${note.title}" will be removed from the task.`, confirmText: 'Delete note', type: 'danger' });
    if (!sure) return;
    setBusy(true);
    try {
      const updated = await deleteTaskNote(task.id, note.id);
      setNotes(updated.notes ?? []);
      onChanged();
      setView({ kind: 'list' });
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const newestFirst = [...notes].reverse();
  const pageCount = Math.max(1, Math.ceil(newestFirst.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageNotes = newestFirst.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const editing = view.kind === 'form';
  const heading = view.kind === 'form' ? (view.id ? 'Edit note' : 'New note') : view.kind === 'detail' ? 'Note' : `Notes (${notes.length})`;

  return (
    <Modal
      description={<>For <span className="font-medium text-slate-700">{task.title}</span></>}
      // A stray click outside must not throw away a note being written.
      dismissOnBackdrop={!editing}
      headerActions={
        view.kind === 'list' ? (
          <Button data-testid="task-note-new" disabled={!task.permissions.canUpdate} icon={Plus} onClick={() => openForm(null)} size="sm" variant="primary">
            New note
          </Button>
        ) : null
      }
      onClose={onClose}
      panelClassName="!max-w-[880px] w-full"
      title={heading}
    >
      <div data-testid="task-notes-modal">
        {view.kind === 'list' ? (
          <div className="grid gap-3">
            {notes.length === 0 ? (
              <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
                <NotebookPen className="text-slate-300" size={28} />
                <p className="m-0 text-sm font-medium text-slate-700">No notes yet</p>
                <p className="m-0 text-[13px] text-slate-500">Add decisions, links and follow-ups for this task.</p>
              </div>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {pageNotes.map((n) => (
                  <li key={n.id}>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                      data-testid="task-note-row"
                      onClick={() => setView({ kind: 'detail', id: n.id })}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{n.title}</span>
                      <ChevronRight className="shrink-0 text-slate-400" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {newestFirst.length > PAGE_SIZE ? (
              <nav aria-label="Notes pages" className="flex items-center justify-between gap-2 pt-1 text-[13px] text-slate-600" data-testid="task-notes-pager">
                <span className="tabular-nums">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, newestFirst.length)} of {newestFirst.length}
                </span>
                <span className="flex items-center gap-1.5">
                  <Button aria-label="Previous page" data-testid="task-notes-prev" disabled={safePage <= 1} icon={ChevronLeft} onClick={() => setPage(safePage - 1)} size="sm" variant="secondary">
                    Prev
                  </Button>
                  <span className="px-1 tabular-nums">
                    Page {safePage} of {pageCount}
                  </span>
                  <Button aria-label="Next page" data-testid="task-notes-next" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} size="sm" variant="secondary">
                    Next <ChevronRight size={14} />
                  </Button>
                </span>
              </nav>
            ) : null}
          </div>
        ) : null}

        {view.kind === 'detail' && current ? (
          <article className="grid gap-3" data-testid="task-note-detail">
            <div>
              <button className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={() => setView({ kind: 'list' })} type="button">
                <ArrowLeft size={14} /> All notes
              </button>
            </div>
            <div>
              <h3 className="m-0 break-words text-base font-semibold text-slate-900">{current.title}</h3>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                {meta(current)}
                {current.updatedAt && current.createdAt && current.updatedAt !== current.createdAt ? ` · edited ${when(current.updatedAt)}` : ''}
              </p>
            </div>
            <RichTextView className="rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-3" value={current.text} />
            {canTouch(current) ? (
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button data-testid="task-note-delete" disabled={busy} icon={Trash2} onClick={() => void remove(current)} variant="danger">
                  Delete
                </Button>
                <Button data-testid="task-note-edit" disabled={busy} icon={Pencil} onClick={() => openForm(current)} variant="secondary">
                  Edit
                </Button>
              </div>
            ) : null}
          </article>
        ) : null}

        {view.kind === 'form' ? (
          <form
            className="grid grid-cols-[minmax(0,1fr)] gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <Field label="Title">
              <Input autoFocus data-testid="task-note-title" maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kickoff decisions" value={title} />
            </Field>
            <div className="grid gap-1">
              <span className="text-[13px] font-medium text-slate-700">Description</span>
              <RichTextEditor aria-label="Note description" minHeight={340} onChange={setText} placeholder="Write the details, decisions or links…" value={text} />
            </div>
            <div className="flex justify-between gap-2 border-t border-slate-100 pt-4">
              <Button disabled={busy} onClick={() => setView(current ? { kind: 'detail', id: current.id } : { kind: 'list' })} variant="ghost">
                Cancel
              </Button>
              <Button data-testid="task-note-save" disabled={busy || !title.trim() || isRichEmpty(text)} loading={busy} type="submit" variant="primary">
                {view.id ? 'Save changes' : 'Add note'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </Modal>
  );
}

export default TaskNotesModal;
