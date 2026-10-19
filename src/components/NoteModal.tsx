import { FormEvent, useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { Button, Field, inputClass, textareaClass } from '@/components/ui';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setSubmitting(false);
    setErrorMessage(null);
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

    if (!content.trim()) {
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
      onClose={onClose}
      panelClassName="!max-w-[680px] w-full"
      title={modalTitle ?? (note ? 'Edit Note' : 'Create Note')}
      description={<>For <span className="font-medium text-slate-700">{entityLabel}</span></>}
    >
      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        {showTitle ? (
          <Field label="Title">
            <input
              autoFocus
              className={inputClass}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={titlePlaceholder}
              type="text"
              value={title}
            />
          </Field>
        ) : null}

        <Field label="Description">
          <textarea
            className={`${textareaClass} min-h-[220px]`}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write note details, decisions, or follow-ups..."
            value={content}
          />
        </Field>

        {errorMessage ? (
          <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {note && allowDelete && onDelete ? (
              <Button disabled={submitting} onClick={() => void onDelete()} variant="danger">
                {deleteLabel}
              </Button>
            ) : null}

            {note && allowAppend ? (
              <Button disabled={submitting} onClick={(event) => void handleSubmit(event, 'append')} variant="secondary">
                {submitting ? 'Appending...' : 'Append'}
              </Button>
            ) : null}

            <Button disabled={submitting} type="submit" variant="primary">
              {submitting ? 'Saving...' : note ? 'Save changes' : 'Create note'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default NoteModal;
