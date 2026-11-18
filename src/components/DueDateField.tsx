import { DateInput, Switch } from '@/components/ui';
import { toIsoDate } from '@/components/ui/DateInput';

interface DueDateFieldProps {
  /** The due date (YYYY-MM-DD), or null/'' for no due date. */
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}

/**
 * A due date is optional: a switch that starts off, and only when it is turned on can a date be picked.
 * Turning it off again clears the date.
 */
export function DueDateField({ value, onChange, disabled = false }: DueDateFieldProps): JSX.Element {
  const enabled = Boolean(value);
  return (
    <div className="grid gap-2" data-testid="due-date-field">
      <Switch
        aria-label="Set a due date"
        checked={enabled}
        data-testid="due-date-toggle"
        disabled={disabled}
        label="Set a due date"
        onChange={(event) => onChange(event.target.checked ? toIsoDate(new Date()) : null)}
      />
      {enabled ? (
        <DateInput
          aria-label="Due date"
          data-testid="due-date-input"
          disabled={disabled}
          onValueChange={(next) => onChange(next || null)}
          value={value}
        />
      ) : null}
    </div>
  );
}
