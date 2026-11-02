import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from './cn';
import { IconTile, type TileTone } from './IconTile';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: TileTone;
  /** Small context line under the value, e.g. "3 due this week". */
  hint?: ReactNode;
  /** Optional coloured accent for the hint (e.g. 'danger' when something is overdue). */
  hintTone?: 'neutral' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  className?: string;
}

const HINT: Record<NonNullable<StatCardProps['hintTone']>, string> = {
  neutral: 'text-slate-500',
  success: 'text-green-700',
  warning: 'text-amber-700',
  danger: 'text-red-600'
};

/** A compact metric: label, large tabular value, context line and a tinted icon. */
export function StatCard({ label, value, icon, tone = 'slate', hint, hintTone = 'neutral', onClick, className }: StatCardProps): JSX.Element {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      className={cn(
        'group flex min-w-0 items-start justify-between gap-3 rounded-[10px] border border-slate-200 bg-white p-4 text-left',
        onClick && 'card-hover cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/20',
        className
      )}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] text-slate-600">{label}</div>
        <div className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">{value}</div>
        {hint ? <div className={cn('mt-1.5 truncate text-xs', HINT[hintTone])}>{hint}</div> : null}
      </div>
      {icon ? <IconTile icon={icon} size="md" tone={tone} /> : null}
    </Comp>
  );
}
