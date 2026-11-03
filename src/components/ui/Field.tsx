import { createContext, useContext, useId, type ReactNode } from 'react';

import { cn } from './cn';

const control =
  'w-full rounded-lg border border-slate-300 bg-white text-[13px] text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 ' +
  'hover:border-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

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

/** The id of the enclosing Field's label, so button-based controls (Select) are named by the label alone. */
const FieldLabelContext = createContext<string | undefined>(undefined);
export const useFieldLabelId = (): string | undefined => useContext(FieldLabelContext);

/** A label above a control, with optional hint and error text below it. */
export function Field({ label, hint, error, children, className }: FieldProps): JSX.Element {
  const labelId = useId();
  return (
    <label className={cn('grid gap-1', className)}>
      <span className="text-[13px] font-medium text-slate-700" id={labelId}>
        {label}
      </span>
      <FieldLabelContext.Provider value={labelId}>{children}</FieldLabelContext.Provider>
      {error ? <span className="text-xs text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
