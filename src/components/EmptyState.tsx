import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  compact?: boolean;
  description: string;
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

/** A friendly empty view: a small layered icon composition, a sentence and an optional action. */
function EmptyState({ compact = false, description, icon: Icon, title, action }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center',
        compact ? 'gap-2.5 px-4 py-5' : 'gap-3.5 px-6 py-10'
      ].join(' ')}
    >
      <div aria-hidden="true" className={['relative', compact ? 'h-10 w-12' : 'h-14 w-16'].join(' ')}>
        <span
          className={[
            'absolute rounded-lg border border-slate-200 bg-slate-50',
            compact ? 'left-0 top-1.5 h-7 w-7 -rotate-12' : 'left-0 top-2 h-10 w-10 -rotate-12'
          ].join(' ')}
        />
        <span
          className={[
            'absolute rounded-lg border border-emerald-100 bg-emerald-50/70',
            compact ? 'right-0 top-1.5 h-7 w-7 rotate-12' : 'right-0 top-2 h-10 w-10 rotate-12'
          ].join(' ')}
        />
        <span
          className={[
            'absolute left-1/2 top-0 inline-flex -translate-x-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-600 shadow-sm',
            compact ? 'h-9 w-9' : 'h-12 w-12'
          ].join(' ')}
        >
          <Icon size={compact ? 17 : 22} strokeWidth={1.9} />
        </span>
      </div>
      <div className="grid max-w-md gap-1">
        <strong className="text-sm font-semibold text-slate-900">{title}</strong>
        <p className="m-0 text-[13px] text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default EmptyState;
