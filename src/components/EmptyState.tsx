import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  compact?: boolean;
  description: string;
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

function EmptyState({ compact = false, description, icon: Icon, title, action }: EmptyStateProps): JSX.Element {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center',
        compact ? 'gap-2.5 px-4 py-6' : 'gap-4 px-6 py-12'
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className={[
          'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500',
          compact ? 'h-9 w-9' : 'h-11 w-11'
        ].join(' ')}
      >
        <Icon size={compact ? 17 : 20} />
      </div>
      <div className="grid max-w-md gap-1">
        <strong className="text-[15px] font-semibold text-slate-900">{title}</strong>
        <p className="m-0 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default EmptyState;
