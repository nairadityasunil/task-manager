import { FormEvent, useState } from 'react';

import { Button, Field, textareaClass, Input } from '@/components/ui';
import { isHeldForApproval, toDisplayErrorMessage } from '@/utils/apiError';

/** Matches the server's limit. */
const MAX_PROJECT_NAME_LENGTH = 80;

interface ProjectFormProps {
  initialDescription?: string;
  initialName?: string;
  onSubmit: (payload: { name: string; description?: string }) => Promise<void>;
  submitLabel?: string;
}

function ProjectForm({
  initialDescription = '',
  initialName = '',
  onSubmit,
  submitLabel = 'Create project',
}: ProjectFormProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmed = name.trim();
  const tooLong = trimmed.length > MAX_PROJECT_NAME_LENGTH;
  const nameError = tooLong
    ? `Use at most ${MAX_PROJECT_NAME_LENGTH} characters (this has ${trimmed.length}).`
    : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!trimmed) {
      setErrorMessage('Enter a project name.');
      return;
    }
    if (tooLong) {
      setErrorMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name: trimmed,
        description: description.trim() || undefined,
      });
      setName(initialName);
      setDescription(initialDescription);
    } catch (error) {
      // Say what actually happened: a validation message, or that an automated session's change is waiting for a person.
      setErrorMessage(
        isHeldForApproval(error)
          ? `Sent for approval, not saved yet. ${toDisplayErrorMessage(error)}`
          : toDisplayErrorMessage(error) || `Unable to ${submitLabel.toLowerCase()} right now.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field
        error={nameError ?? undefined}
        hint={`${trimmed.length}/${MAX_PROJECT_NAME_LENGTH}`}
        label="Project name"
      >
        <Input
          aria-invalid={tooLong}
          onChange={(event) => setName(event.target.value)}
          placeholder="Backend"
          type="text"
          value={name}
        />
      </Field>
      <Field label="Description">
        <textarea
          className={`${textareaClass} min-h-[96px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional project context"
          rows={3}
          value={description}
        />
      </Field>
      {errorMessage ? (
        <p className="m-0 text-sm text-red-600" data-testid="project-form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button
          className="w-full sm:w-auto"
          disabled={submitting || tooLong}
          type="submit"
          variant="primary"
        >
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default ProjectForm;
