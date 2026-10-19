import type { ReactNode } from 'react';

import { cn } from './cn';

const control =
  'w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 ' +
  'focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

/** Class strings for native form controls, so existing inputs can adopt the design system. */
export const inputClass = cn(control, 'h-9 px-3');
export const selectClass = cn(control, 'h-9 pl-3 pr-8');
export const textareaClass = cn(control, 'px-3 py-2 leading-relaxed');

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A label above a control, with optional hint and error text below it. */
export function Field({ label, hint, error, children, className }: FieldProps): JSX.Element {
  return (
    <label className={cn('grid gap-1.5', className)}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
