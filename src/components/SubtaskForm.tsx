import { ClipboardEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

import { TASK_WORKFLOW_STATUS_OPTIONS, type TaskWorkflowStatus } from '@/types/task';
import type { ProjectMember } from '@/types/project';
import { Button, Field, cn, inputClass, selectClass, Select, Input } from '@/components/ui';
import { toDisplayErrorMessage } from '@/utils/apiError';

interface SubtaskDraft {
  id: string;
  title: string;
  description?: string;
  note?: string;
  status: TaskWorkflowStatus;
  assignedToUserId?: string | null;
  open: boolean;
}

interface SubtaskFormProps {
  onSubmit: (payload: Array<{ title: string; description?: string; note?: string; status: TaskWorkflowStatus; assignedToUserId?: string | null }>) => Promise<void>;
  members: ProjectMember[];
}

/** Most sub-tasks fit on one line; more than this many at once is almost certainly a paste mistake. */
const MAX_DRAFTS = 50;

const createDraft = (title = ''): SubtaskDraft => ({
  id: crypto.randomUUID(),
  title,
  description: '',
  note: '',
  status: 'TODO',
  assignedToUserId: null,
  open: false
});

/** Lines from pasted text, without list markers ("- ", "* ", "1. ", "[ ] "). */
const pastedLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+|\[[ xX]?\]\s+)/, '').trim())
    .filter(Boolean);

function SubtaskForm({ onSubmit, members }: SubtaskFormProps): JSX.Element {
  const [drafts, setDrafts] = useState<SubtaskDraft[]>([createDraft()]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const titleRefs = useRef(new Map<string, HTMLInputElement>());
  const [focusId, setFocusId] = useState<string | null>(drafts[0].id);

  useEffect(() => {
    if (!focusId) return;
    titleRefs.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId, drafts]);

  const updateDraft = (draftId: string, patch: Partial<Omit<SubtaskDraft, 'id'>>): void => {
    setDrafts((current) => current.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)));
  };

  /** Adds a row after `afterId` (or at the end) and focuses it. */
  const addDraft = (afterId?: string): void => {
    if (drafts.length >= MAX_DRAFTS) return;
    const next = createDraft();
    setDrafts((current) => {
      const index = afterId ? current.findIndex((draft) => draft.id === afterId) : -1;
      if (index === -1) return [...current, next];
      return [...current.slice(0, index + 1), next, ...current.slice(index + 1)];
    });
    setFocusId(next.id);
  };

  const removeDraft = (draftId: string): void => {
    setDrafts((current) => (current.length === 1 ? [createDraft()] : current.filter((draft) => draft.id !== draftId)));
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>, draft: SubtaskDraft, index: number): void => {
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
      // Enter moves on to a new sub-task; Ctrl/Cmd+Enter submits the form.
      event.preventDefault();
      if (draft.title.trim()) addDraft(draft.id);
    } else if (event.key === 'Backspace' && draft.title === '' && drafts.length > 1) {
      event.preventDefault();
      const previous = drafts[index - 1] ?? drafts[index + 1];
      removeDraft(draft.id);
      if (previous) setFocusId(previous.id);
    }
  };

  /** Pasting several lines creates one sub-task per line. */
  const handleTitlePaste = (event: ClipboardEvent<HTMLInputElement>, draft: SubtaskDraft): void => {
    const lines = pastedLines(event.clipboardData.getData('text'));
    if (lines.length < 2) return;
    event.preventDefault();
    setDrafts((current) => {
      const index = current.findIndex((item) => item.id === draft.id);
      const keep = current[index].title.trim();
      const room = MAX_DRAFTS - current.length + (keep ? 0 : 1);
      const added = lines.slice(0, Math.max(0, room)).map((line) => createDraft(line));
      const replaced = keep ? [current[index], ...added] : added;
      return [...current.slice(0, index), ...replaced, ...current.slice(index + 1)];
    });
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    const normalized = drafts
      .map((draft) => ({
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        note: draft.note?.trim() || undefined,
        status: draft.status,
        assignedToUserId: draft.assignedToUserId || null
      }))
      .filter((draft) => draft.title !== '');

    if (normalized.length === 0) {
      setErrorMessage('Give the sub-task a title.');
      setFocusId(drafts[0].id);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(normalized);
      setDrafts([createDraft()]);
    } catch (error) {
      setErrorMessage(toDisplayErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const count = drafts.filter((draft) => draft.title.trim()).length;

  return (
    <form
      className="grid gap-4"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void handleSubmit();
        }
      }}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <p className="m-0 text-xs text-slate-500">
        Press Enter for the next sub-task. Paste a list to add one sub-task per line.
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {drafts.map((draft, index) => (
          <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5" data-testid="subtask-draft" key={draft.id}>
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-slate-400">{index + 1}</span>
              <input
                aria-label={`Sub-task ${index + 1} title`}
                className={cn(inputClass, 'min-w-0 flex-1')}
                disabled={submitting}
                maxLength={200}
                onChange={(event) => updateDraft(draft.id, { title: event.target.value })}
                onKeyDown={(event) => handleTitleKeyDown(event, draft, index)}
                onPaste={(event) => handleTitlePaste(event, draft)}
                placeholder={index === 0 ? 'e.g. Write tests' : 'Next sub-task'}
                ref={(element) => {
                  if (element) titleRefs.current.set(draft.id, element);
                  else titleRefs.current.delete(draft.id);
                }}
                type="text"
                value={draft.title}
              />
              <Button
                aria-expanded={draft.open}
                aria-label={`Details for sub-task ${index + 1}`}
                className="shrink-0"
                onClick={() => updateDraft(draft.id, { open: !draft.open })}
                size="icon-sm"
                variant="ghost"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', draft.open && 'rotate-180')} />
              </Button>
              <Button
                aria-label={`Remove sub-task ${index + 1}`}
                className="shrink-0 text-slate-400 hover:text-red-600"
                disabled={submitting}
                icon={Trash2}
                onClick={() => removeDraft(draft.id)}
                size="icon-sm"
                variant="ghost"
              />
            </div>
            {draft.open ? (
              <div className="mt-2.5 grid gap-3 pl-7">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Assign to">
                    <Select
                      className={selectClass}
                      onChange={(event) => updateDraft(draft.id, { assignedToUserId: event.target.value || null })}
                      value={draft.assignedToUserId || ''}
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.userId}>
                          {member.user.name || member.user.email}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select
                      className={selectClass}
                      onChange={(event) => updateDraft(draft.id, { status: event.target.value as TaskWorkflowStatus })}
                      value={draft.status}
                    >
                      {TASK_WORKFLOW_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Description">
                  <Input
                    onChange={(event) => updateDraft(draft.id, { description: event.target.value })}
                    placeholder="Optional"
                    type="text"
                    value={draft.description}
                  />
                </Field>
                <Field label="Internal note">
                  <Input
                    onChange={(event) => updateDraft(draft.id, { note: event.target.value })}
                    placeholder="Optional private note"
                    type="text"
                    value={draft.note}
                  />
                </Field>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {errorMessage ? (
        <p className="m-0 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button disabled={submitting || drafts.length >= MAX_DRAFTS} icon={Plus} onClick={() => addDraft()} variant="secondary">
          Add another
        </Button>
        <Button disabled={submitting || count === 0} loading={submitting} type="submit" variant="primary">
          {count > 1 ? `Create ${count} sub-tasks` : 'Create sub-task'}
        </Button>
      </div>
    </form>
  );
}

export default SubtaskForm;
