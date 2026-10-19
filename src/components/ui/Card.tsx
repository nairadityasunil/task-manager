import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

/** The standard surface: white, hairline border, small shadow, 12px radius. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props} />;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps): JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5', className)}>
      <div className="min-w-0">
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">{title}</h3>
        {description ? <p className="m-0 mt-0.5 text-[13px] text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
