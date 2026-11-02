import { forwardRef, useCallback, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Paperclip, X } from 'lucide-react';

import { cn } from './cn';
import { inputClass, textareaClass } from './Field';
import { popoverPanelClass, usePopover } from './usePopover';

/** Text input with the design-system look. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input className={cn(inputClass, className)} ref={ref} {...props} />;
});

/** Multi-line text input with the design-system look. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea className={cn(textareaClass, className)} ref={ref} {...props} />;
});

/** A range slider with a filled track. Same props as `<input type="range">`. */
export const Slider = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function Slider(
  { className, min = 0, max = 100, value, style, ...props },
  ref
) {
  const low = Number(min);
  const high = Number(max);
  const percent = high > low ? ((Number(value ?? low) - low) / (high - low)) * 100 : 0;
  return (
    <input
      className={cn('ui-range', className)}
      max={max}
      min={min}
      ref={ref}
      style={{ ...style, ['--fill' as string]: `${Math.min(100, Math.max(0, percent))}%` }}
      type="range"
      value={value}
      {...props}
    />
  );
});

interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  /** The chosen file, to show its name; pass null to show the empty state. */
  file?: File | null;
  buttonLabel?: ReactNode;
  emptyText?: ReactNode;
  onClear?: () => void;
}

/** A file picker: a button and the chosen file name, instead of the browser's file control. */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  { className, file, buttonLabel = 'Choose file', emptyText = 'No file chosen', onClear, disabled, ...props },
  ref
) {
  const inner = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<string>('');
  const name = file === undefined ? picked : file?.name ?? '';
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <input
        className="sr-only"
        disabled={disabled}
        ref={(node) => {
          inner.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="file"
        {...props}
        onChange={(event) => {
          setPicked(event.target.files?.[0]?.name ?? '');
          props.onChange?.(event);
        }}
      />
      <button
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/20 disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
        onClick={() => inner.current?.click()}
        type="button"
      >
        <Paperclip aria-hidden size={14} />
        {buttonLabel}
      </button>
      <span className={cn('min-w-0 truncate text-[13px]', name ? 'text-slate-800' : 'text-slate-500')}>{name || emptyText}</span>
      {name && onClear ? (
        <button
          aria-label="Remove file"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          onClick={() => {
            if (inner.current) inner.current.value = '';
            setPicked('');
            onClear();
          }}
          type="button"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
});

const SWATCHES = [
  '#64748B', '#57534E', '#3E50D8', '#316698', '#0E7490', '#2F7D4F', '#65A30D', '#A16207',
  '#C2410C', '#DC2626', '#B4416E', '#6D5BD0', '#9333EA', '#0F766E', '#1C1917', '#94A3B8'
];

interface ColorInputProps {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/** A colour picker: a swatch button opening a palette with a hex field. */
export function ColorInput({ value, onChange, className, disabled, ...aria }: ColorInputProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, style } = usePopover<HTMLButtonElement, HTMLDivElement>({ open, onClose: close });
  const [hex, setHex] = useState(value);
  const pick = (next: string) => onChange({ target: { value: next } });
  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={aria['aria-label'] ?? 'Choose colour'}
        className={cn(
          'grid h-9 w-10 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white shadow-sm transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/20 disabled:opacity-50',
          className
        )}
        disabled={disabled}
        onClick={() => {
          setHex(value);
          setOpen((isOpen) => !isOpen);
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="h-5 w-5 rounded-[5px] ring-1 ring-inset ring-black/10" style={{ background: value }} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div aria-label="Choose colour" className={cn(popoverPanelClass, 'w-[212px] p-2.5')} ref={panelRef} role="dialog" style={style}>
              <div className="grid grid-cols-8 gap-1.5">
                {SWATCHES.map((swatch) => (
                  <button
                    aria-label={swatch}
                    aria-pressed={swatch.toLowerCase() === value.toLowerCase()}
                    className={cn(
                      'h-5 w-5 rounded-[5px] ring-1 ring-inset ring-black/10 transition-transform hover:scale-110',
                      swatch.toLowerCase() === value.toLowerCase() && 'outline outline-2 outline-offset-2 outline-slate-900'
                    )}
                    key={swatch}
                    onClick={() => {
                      pick(swatch);
                      setOpen(false);
                    }}
                    style={{ background: swatch }}
                    type="button"
                  />
                ))}
              </div>
              <label className="mt-2.5 flex h-8 items-center gap-2 rounded-md border border-slate-200 px-2">
                <span className="text-[12px] text-slate-500">Hex</span>
                <input
                  aria-label="Hex colour"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-[12px] uppercase text-slate-900 outline-none"
                  maxLength={7}
                  onChange={(event) => {
                    const next = event.target.value.startsWith('#') ? event.target.value : `#${event.target.value}`;
                    setHex(next);
                    if (/^#[0-9a-f]{6}$/i.test(next)) pick(next.toUpperCase());
                  }}
                  value={hex}
                />
              </label>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
