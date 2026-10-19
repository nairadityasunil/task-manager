import { FileText, Plus, ScrollText, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui';

import EmptyState from '@/components/EmptyState';
import type { Note } from '@/types/note';

interface ProjectNotesProps {
  actionNoteId: string | null;
  createLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  heading?: string;
  loading: boolean;
  notes: Note[];
  onCreateNote?: () => void;
  onDeleteNote?: (note: Note) => void;
  onOpenNote: (note: Note) => void;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const formatTimestamp = (value?: string): string => {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Just now' : timestampFormatter.format(date);
};

function ProjectNotes({
  actionNoteId,
  createLabel = 'Create note',
  emptyDescription = 'Create the first note to capture decisions, references, or follow-ups for this project.',
  emptyTitle = 'No notes yet',
  heading = 'Notes',
  loading,
  notes,
  onCreateNote,
  onDeleteNote,
  onOpenNote
}: ProjectNotesProps): JSX.Element {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">{heading}</h3>
        {onCreateNote ? (
          <Button icon={Plus} onClick={onCreateNote} size="sm" variant="primary">
            {createLabel}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-2" aria-busy="true">
          {[0, 1].map((key) => <div className="h-14 animate-pulse rounded-lg bg-slate-100" key={key} />)}
          <span className="sr-only">Loading notes...</span>
        </div>
      ) : null}

      {!loading && notes.length === 0 ? (
        <EmptyState compact description={emptyDescription} icon={ScrollText} title={emptyTitle} />
      ) : null}

      {notes.length ? (
        <ul className="m-0 grid max-h-[520px] list-none divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 p-0">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center gap-2 pr-2">
              <button
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 sm:px-4"
                onClick={() => onOpenNote(note)}
                type="button"
              >
                <FileText className="shrink-0 text-slate-400" size={16} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{note.title}</span>
                  <span className="block text-xs text-slate-500">Updated {formatTimestamp(note.updatedAt)}</span>
                </span>
              </button>
              {onDeleteNote ? (
                <Button
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={actionNoteId === note.id}
                  icon={Trash2}
                  onClick={() => onDeleteNote(note)}
                  size="sm"
                  variant="ghost"
                >
                  {actionNoteId === note.id ? 'Deleting...' : 'Delete'}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default ProjectNotes;
