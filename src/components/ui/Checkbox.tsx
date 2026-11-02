import { forwardRef, useEffect, useImperativeHandle, useRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from './cn';

type BoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** Shows a dash: some but not all items are selected. */
  indeterminate?: boolean;
  /** Optional text next to the box; the whole row is clickable. */
  label?: ReactNode;
  description?: ReactNode;
};

const boxBase =
  'peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none border border-slate-300 bg-white transition-colors ' +
  'hover:border-slate-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/25 ' +
  'checked:border-brand-600 checked:bg-brand-600 checked:hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';

function withLabel(control: ReactNode, label: ReactNode, description: ReactNode, className: string | undefined, disabled?: boolean) {
  if (!label) return control;
  return (
    <label className={cn('inline-flex items-start gap-2.5 text-[13px] text-slate-700', disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer', className)}>
      <span className="mt-0.5 inline-flex">{control}</span>
      <span className="min-w-0">
        <span className="block text-slate-900">{label}</span>
        {description ? <span className="block text-xs text-slate-500">{description}</span> : null}
      </span>
    </label>
  );
}

/** A styled checkbox. Keeps the real input (so forms, labels and keyboard work) with a custom look. */
export const Checkbox = forwardRef<HTMLInputElement, BoxProps>(function Checkbox({ className, indeterminate = false, label, description, ...props }, ref) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const control = (
    <span className={cn('relative inline-grid h-4 w-4 shrink-0 place-items-center align-middle', !label && className)}>
      <input
        className={cn(boxBase, 'rounded-[4px]', indeterminate && 'border-brand-600 bg-brand-600')}
        ref={inner}
        type="checkbox"
        {...props}
      />
      <svg
        aria-hidden
        className={cn('pointer-events-none relative h-3 w-3 text-white', indeterminate ? 'hidden' : 'hidden peer-checked:block')}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
        viewBox="0 0 24 24"
      >
        <path d="m5 12 5 5 9-10" />
      </svg>
      {indeterminate ? <span aria-hidden className="pointer-events-none relative h-[2px] w-2 rounded bg-white" /> : null}
    </span>
  );
  return withLabel(control, label, description, className, props.disabled);
});

/** A styled radio button. */
export const Radio = forwardRef<HTMLInputElement, Omit<BoxProps, 'indeterminate'>>(function Radio({ className, label, description, ...props }, ref) {
  const control = (
    <span className={cn('relative inline-grid h-4 w-4 shrink-0 place-items-center align-middle', !label && className)}>
      <input className={cn(boxBase, 'rounded-full')} ref={ref} type="radio" {...props} />
      <span aria-hidden className="pointer-events-none relative hidden h-1.5 w-1.5 rounded-full bg-white peer-checked:block" />
    </span>
  );
  return withLabel(control, label, description, className, props.disabled);
});

/** An on/off switch (a checkbox with role="switch"). */
export const Switch = forwardRef<HTMLInputElement, Omit<BoxProps, 'indeterminate'>>(function Switch({ className, label, description, ...props }, ref) {
  const control = (
    <span className={cn('relative inline-flex h-5 w-9 shrink-0 align-middle', !label && className)}>
      <input
        className={cn(
          'peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors',
          'hover:bg-slate-400 checked:bg-brand-600 checked:hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/25',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        ref={ref}
        role="switch"
        type="checkbox"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-4"
      />
    </span>
  );
  return withLabel(control, label, description, className, props.disabled);
});
