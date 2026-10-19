import { FormEvent, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { TASK_WORKFLOW_STATUS_OPTIONS, type TaskWorkflowStatus } from '@/types/task';
import type { ProjectMember } from '@/types/project';
import UserAvatar from './UserAvatar';
import { Button, Field, inputClass, selectClass } from '@/components/ui';

interface SubtaskDraft {
  id: string;
  title: string;
  description?: string;
  note?: string;
  status: TaskWorkflowStatus;
  assignedToUserId?: string | null;
}

interface SubtaskFormProps {
  onSubmit: (payload: Array<{ title: string; description?: string; note?: string; status: TaskWorkflowStatus; assignedToUserId?: string | null }>) => Promise<void>;
  members: ProjectMember[];
}

const createDraft = (): SubtaskDraft => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  note: '',
  status: 'TODO',
  assignedToUserId: null
});

function SubtaskForm({ onSubmit, members }: SubtaskFormProps): JSX.Element {
  const [drafts, setDrafts] = useState<SubtaskDraft[]>([createDraft()]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateDraft = (draftId: string, field: keyof Omit<SubtaskDraft, 'id'>, value: string | null): void => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? { ...draft, [field]: value } : draft))
    );
  };

  const handleAddDraft = (): void => {
    setDrafts((current) => [...current, createDraft()]);
  };

  const handleRemoveDraft = (draftId: string): void => {
    setDrafts((current) => (current.length === 1 ? current : current.filter((draft) => draft.id !== draftId)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const normalizedDrafts = drafts
      .map((draft) => ({
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        note: draft.note?.trim() || undefined,
        status: draft.status,
        assignedToUserId: draft.assignedToUserId
      }))
      .filter((draft) => draft.title !== '');

    if (normalizedDrafts.length === 0) {
      setErrorMessage('At least one sub-task title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(
        normalizedDrafts.map((draft) => ({
          title: draft.title,
          description: draft.description,
          note: draft.note,
          status: draft.status,
          assignedToUserId: draft.assignedToUserId
        }))
      );
      setDrafts([createDraft()]);
    } catch {
      setErrorMessage('Unable to create the sub-tasks right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-3">
        {drafts.map((draft, index) => (
          <div key={draft.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">Sub-task {index + 1}</span>
              <Button
                disabled={submitting || drafts.length === 1}
                icon={Trash2}
                onClick={() => handleRemoveDraft(draft.id)}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Remove
              </Button>
            </div>

            <Field label="Sub-task title">
              <input
                className={inputClass}
                onChange={(event) => updateDraft(draft.id, 'title', event.target.value)}
                placeholder="Write tests"
                type="text"
                value={draft.title}
              />
            </Field>

            <Field label="Description">
              <input
                className={inputClass}
                onChange={(event) => updateDraft(draft.id, 'description', event.target.value)}
                placeholder="Optional description"
                type="text"
                value={draft.description}
              />
            </Field>

            <Field label="Internal note">
              <input
                className={inputClass}
                onChange={(event) => updateDraft(draft.id, 'note', event.target.value)}
                placeholder="Optional private note"
                type="text"
                value={draft.note}
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className={selectClass}
                  onChange={(event) => updateDraft(draft.id, 'status', event.target.value)}
                  value={draft.status}
                >
                  {TASK_WORKFLOW_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Assign to">
                <div className="flex items-center gap-2">
                  <select
                    className={selectClass}
                    onChange={(event) => updateDraft(draft.id, 'assignedToUserId', event.target.value || null)}
                    value={draft.assignedToUserId || ''}
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.userId}>
                        {member.user.name || member.user.email}
                      </option>
                    ))}
                  </select>
                  {draft.assignedToUserId && (
                    <UserAvatar
                      name={members.find(m => m.userId === draft.assignedToUserId)?.user.name || null}
                      email={members.find(m => m.userId === draft.assignedToUserId)?.user.email || ''}
                      size="md"
                      showTooltip={false}
                    />
                  )}
                </div>
              </Field>
            </div>
          </div>
        ))}
      </div>

      {errorMessage ? <p className="m-0 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button disabled={submitting} icon={Plus} onClick={handleAddDraft} variant="secondary">
          Add another sub-task
        </Button>
        <Button disabled={submitting} type="submit" variant="primary">
          {submitting ? 'Creating sub-tasks...' : 'Create sub-tasks'}
        </Button>
      </div>
    </form>
  );
}

export default SubtaskForm;
