import { forwardRef, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from './cn';
import { popoverPanelClass, usePopover } from './usePopover';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n: number) => String(n).padStart(2, '0');
export const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Parses YYYY-MM-DD (also D/M/YYYY-free forms like "2026-3-4") into a local date. */
export function parseIsoDate(text: string | undefined | null): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec((text ?? '').trim().slice(0, 10));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date : null;
}

interface CalendarProps {
  value: string;
  onSelect: (iso: string) => void;
  min?: string;
  max?: string;
  footer?: ReactNode;
  autoFocus?: boolean;
}

/** A month grid; weeks start on Monday. Arrow keys move the focused day. */
export function Calendar({ value, onSelect, min, max, footer, autoFocus }: CalendarProps): JSX.Element {
  const selected = parseIsoDate(value);
  const today = toIsoDate(new Date());
  const [focus, setFocus] = useState(() => selected ?? new Date());
  const [month, setMonth] = useState(() => new Date(focus.getFullYear(), focus.getMonth(), 1));

  useEffect(() => {
    if (focus.getMonth() !== month.getMonth() || focus.getFullYear() !== month.getFullYear()) setMonth(new Date(focus.getFullYear(), focus.getMonth(), 1));
  }, [focus, month]);

  const days = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - ((month.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  const outOfRange = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const shift = (amount: number) => setFocus((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount));
  useEffect(() => {
    if (autoFocus) window.setTimeout(() => document.querySelector<HTMLElement>('[data-calendar] [data-focused]')?.focus(), 0);
  }, [autoFocus]);
  const shiftMonth = (amount: number) => setMonth((date) => new Date(date.getFullYear(), date.getMonth() + amount, 1));

  const onKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      shift(moves[event.key]);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      setFocus((date) => new Date(date.getFullYear(), date.getMonth() + (event.key === 'PageUp' ? -1 : 1), date.getDate()));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const iso = toIsoDate(focus);
      if (!outOfRange(iso)) onSelect(iso);
    }
  };

  return (
    <div className="w-[252px] p-1.5" onKeyDown={onKeyDown}>
      <div className="mb-1.5 flex items-center justify-between">
        <button aria-label="Previous month" className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => shiftMonth(-1)} type="button">
          <ChevronLeft size={15} />
        </button>
        <span aria-live="polite" className="text-[13px] font-semibold text-slate-900">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button aria-label="Next month" className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100" onClick={() => shiftMonth(1)} type="button">
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center" role="grid">
        {WEEKDAYS.map((day) => (
          <span className="pb-1 text-[11px] font-medium text-slate-500" key={day} role="columnheader">
            {day}
          </span>
        ))}
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isSelected = iso === value;
          const isFocus = iso === toIsoDate(focus);
          const disabled = outOfRange(iso);
          return (
            <button
              aria-label={day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              aria-pressed={isSelected}
              className={cn(
                'm-px grid h-8 place-items-center rounded-md font-mono text-[12px] tabular-nums transition-colors',
                day.getMonth() !== month.getMonth() ? 'text-slate-400' : 'text-slate-800',
                !isSelected && !disabled && 'hover:bg-slate-100',
                iso === today && !isSelected && 'font-semibold text-brand-700 ring-1 ring-inset ring-brand-200',
                isSelected && 'bg-brand-600 text-white',
                disabled && 'cursor-not-allowed opacity-40'
              )}
              data-focused={isFocus || undefined}
              disabled={disabled}
              key={iso}
              onClick={() => onSelect(iso)}
              ref={(node) => {
                if (isFocus && node && node.ownerDocument.activeElement?.closest('[data-calendar]')) node.focus();
              }}
              tabIndex={isFocus ? 0 : -1}
              type="button"
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
}

export interface DateInputProps {
  value?: string | null;
  /** Called with a change-event shape ({ target: { value } }) holding YYYY-MM-DD, or '' when cleared. */
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

const fieldBase =
  'flex h-9 w-full min-w-0 items-center rounded-lg border border-slate-300 bg-white text-[13px] text-slate-900 shadow-sm transition-colors ' +
  'hover:border-slate-400 focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-600/20';

/**
 * A date field: type a date (YYYY-MM-DD) or pick one from the calendar. Replaces the browser's date input.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onChange, onValueChange, id, name, className, disabled, required, min, max, placeholder = 'YYYY-MM-DD', ...rest },
  ref
) {
  const iso = (value ?? '').slice(0, 10);
  const [text, setText] = useState(iso);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, style } = usePopover<HTMLDivElement, HTMLDivElement>({ open, onClose: close });

  useEffect(() => setText(iso), [iso]);

  const emit = (next: string) => {
    if (next === iso) return;
    onChange?.({ target: { value: next, name } });
    onValueChange?.(next);
  };

  const pretty = parseIsoDate(iso)?.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={cn(fieldBase, disabled && 'cursor-not-allowed bg-slate-50 text-slate-500', className)} ref={triggerRef} title={pretty}>
      <input
        aria-label={rest['aria-label']}
        autoComplete="off"
        className="h-full min-w-0 flex-1 rounded-lg border-0 bg-transparent pl-3 font-mono text-[13px] tabular-nums outline-none placeholder:font-sans placeholder:text-slate-400 disabled:cursor-not-allowed"
        data-testid={rest['data-testid']}
        disabled={disabled}
        id={id}
        inputMode="numeric"
        name={name}
        onBlur={() => {
          if (text.trim() === '') emit('');
          else if (parseIsoDate(text)) emit(toIsoDate(parseIsoDate(text) as Date));
          else setText(iso);
        }}
        onChange={(event) => {
          setText(event.target.value);
          const parsed = parseIsoDate(event.target.value);
          if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(event.target.value.trim())) emit(toIsoDate(parsed));
          if (event.target.value === '') emit('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && event.altKey) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        placeholder={placeholder}
        ref={ref}
        required={required}
        value={text}
      />
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Choose date"
        className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none"
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        type="button"
      >
        <CalendarDays size={15} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div aria-label="Choose date" className={popoverPanelClass} data-calendar ref={panelRef} role="dialog" style={style}>
              <Calendar
                autoFocus
                footer={
                  <div className="mt-1.5 flex justify-between border-t border-slate-100 pt-1.5">
                    <button
                      className="rounded-md px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-100"
                      onClick={() => {
                        emit('');
                        setOpen(false);
                      }}
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-md px-2 py-1 text-[12px] font-medium text-brand-700 hover:bg-brand-50"
                      onClick={() => {
                        emit(toIsoDate(new Date()));
                        setOpen(false);
                      }}
                      type="button"
                    >
                      Today
                    </button>
                  </div>
                }
                max={max}
                min={min}
                onSelect={(next) => {
                  emit(next);
                  setOpen(false);
                }}
                value={iso}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
});
