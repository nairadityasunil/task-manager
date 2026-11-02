import type { HTMLAttributes } from 'react';

import { cn } from './cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'dark' | 'brand' | 'violet' | 'orange';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-transparent',
  // Explicit green: emerald now carries the brand accent.
  success: 'bg-green-50 text-green-800 ring-transparent',
  warning: 'bg-amber-50 text-amber-800 ring-transparent',
  danger: 'bg-red-50 text-red-700 ring-transparent',
  info: 'bg-brand-50 text-brand-700 ring-transparent',
  dark: 'bg-slate-900 text-white ring-slate-900',
  brand: 'bg-brand-50 text-brand-700 ring-transparent',
  violet: 'bg-violet-50 text-violet-800 ring-transparent',
  orange: 'bg-orange-50 text-orange-800 ring-transparent'
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', dot = false, className, children, ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset', TONES[tone], className)}
      {...props}
    >
      {dot ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}
