import { FormEvent, useState } from 'react';

import { Button, Field, inputClass, textareaClass } from '@/components/ui';

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
  submitLabel = 'Create project'
}: ProjectFormProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage('Project name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined
      });
      setName(initialName);
      setDescription(initialDescription);
    } catch {
      setErrorMessage(`Unable to ${submitLabel.toLowerCase()} right now.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Project name">
        <input className={inputClass} onChange={(event) => setName(event.target.value)} placeholder="Backend" type="text" value={name} />
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
      {errorMessage ? <p className="m-0 text-sm text-red-600">{errorMessage}</p> : null}
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button className="w-full sm:w-auto" disabled={submitting} type="submit" variant="primary">
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default ProjectForm;
