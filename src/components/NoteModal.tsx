import { Lock, LockOpen } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { Button, Field, Input } from '@/components/ui';
import { CopyNoteButton } from '@/components/rich-text/CopyNoteButton';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { isRichEmpty } from '@/components/rich-text/richText';
import type { Note } from '@/types/note';

interface NoteModalProps {
  allowAppend?: boolean;
  allowDelete?: boolean;
  deleteLabel?: string;
  entityLabel: string;
  modalTitle?: string;
  note?: Pick<Note, 'title' | 'content'> | null;
  onClose: () => void;
  onDelete?: () => Promise<void> | void;
  onSave: (payload: { appendContent?: boolean; title?: string; content: string }) => Promise<void>;
  showTitle?: boolean;
  titlePlaceholder?: string;
}

function NoteModal({
  allowAppend = false,
  allowDelete = false,
  deleteLabel = 'Delete',
  entityLabel,
  modalTitle,
  note = null,
  onClose,
  onDelete,
  onSave,
  showTitle = true,
  titlePlaceholder = 'Note title'
}: NoteModalProps): JSX.Element {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [submitting, setSubmitting] = useState(false);
  // An existing note opens locked so a stray keystroke cannot change it; a new note is open for writing.
  const [locked, setLocked] = useState(note != null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setSubmitting(false);
    setErrorMessage(null);
    setLocked(note != null);
  }, [note]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<void> => {
    event.preventDefault();

    if (showTitle && !title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }

    if (isRichEmpty(content)) {
      setErrorMessage('Description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSave({
        appendContent: mode === 'append',
        title: showTitle ? title.trim() : undefined,
        content: content.trim()
      });
    } catch {
      setErrorMessage('Unable to save note right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      backdropClassName="items-center overflow-y-auto"
      headerActions={
        <>
          <CopyNoteButton body={content} title={showTitle ? title : null} />
          {note ? (
            <Button
              aria-label={locked ? 'Unlock to edit' : 'Lock to prevent edits'}
              aria-pressed={locked}
              data-testid="note-lock"
              icon={locked ? Lock : LockOpen}
              onClick={() => setLocked((value) => !value)}
              size="sm"
              title={locked ? 'Locked: click to edit' : 'Editing: click to lock'}
              type="button"
              variant="ghost"
            />
          ) : null}
        </>
      }
      onClose={onClose}
      panelClassName="!max-w-[880px] w-full"
      title={modalTitle ?? (note ? 'Edit Note' : 'Create Note')}
      description={<>For <span className="font-medium text-slate-700">{entityLabel}</span></>}
    >
      <form className="grid grid-cols-[minmax(0,1fr)] gap-4" onSubmit={(event) => void handleSubmit(event)}>
        {showTitle ? (
          <Field label="Title">
            <Input
              autoFocus={!locked}
              onChange={(event) => setTitle(event.target.value)}
              readOnly={locked}
              placeholder={titlePlaceholder}
              type="text"
              value={title}
            />
          </Field>
        ) : null}

        <Field label="Description">
          <RichTextEditor
            aria-label="Note"
            autoFocus={!showTitle && !locked}
            disabled={locked}
            minHeight={340}
            onChange={setContent}
            placeholder="Write note details, decisions, or follow-ups..."
            value={content}
          />
        </Field>

        {locked ? (
          <p className="m-0 text-[13px] text-slate-500" data-testid="note-locked-hint">
            Locked to prevent accidental edits. Click the lock to edit.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {note && allowDelete && onDelete ? (
              <Button disabled={submitting || locked} onClick={() => void onDelete()} variant="danger">
                {deleteLabel}
              </Button>
            ) : null}

            {note && allowAppend ? (
              <Button disabled={submitting || locked} onClick={(event) => void handleSubmit(event, 'append')} variant="secondary">
                {submitting ? 'Appending...' : 'Append'}
              </Button>
            ) : null}

            <Button disabled={submitting || locked} type="submit" variant="primary">
              {submitting ? 'Saving...' : note ? 'Save changes' : 'Create note'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default NoteModal;
