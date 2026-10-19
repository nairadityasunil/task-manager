import { FormEvent, useState } from 'react';

import { Button, Field, inputClass, selectClass, textareaClass } from '@/components/ui';
import { EPIC_STATUS_OPTIONS, type EpicStatus } from '@/types/epic';

interface EpicFormProps {
  initialDescription?: string;
  initialName?: string;
  initialStatus?: EpicStatus;
  onSubmit: (payload: { description?: string; name: string; status: EpicStatus }) => Promise<void>;
  submitLabel?: string;
}

function EpicForm({
  initialDescription = '',
  initialName = '',
  initialStatus = 'planned',
  onSubmit,
  submitLabel = 'Save epic'
}: EpicFormProps): JSX.Element {
  const [name, setName] = useState<string>(initialName);
  const [description, setDescription] = useState<string>(initialDescription);
  const [status, setStatus] = useState<EpicStatus>(initialStatus);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (name.trim() === '') {
      setErrorMessage('Epic name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        status
      });
    } catch {
      setErrorMessage('Unable to save the epic right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Epic name">
        <input className={inputClass} onChange={(event) => setName(event.target.value)} placeholder="Launch workflow cleanup" type="text" value={name} />
      </Field>

      <Field label="Description">
        <textarea
          className={`${textareaClass} min-h-[96px] resize-y`}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional context for the tasks grouped under this epic"
          rows={4}
          value={description}
        />
      </Field>

      <Field label="Status">
        <select className={selectClass} onChange={(event) => setStatus(event.target.value as EpicStatus)} value={status}>
          {EPIC_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      {errorMessage ? <p className="m-0 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button className="w-full sm:w-auto" disabled={submitting} type="submit" variant="primary">
          {submitting ? 'Saving epic...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default EpicForm;
