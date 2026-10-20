import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

/** The standard surface: white, hairline border, small shadow, 12px radius. */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a hover lift for clickable cards. */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...props }: CardProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)]',
        interactive && 'card-hover',
        className
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, icon, description, actions, className }: CardHeaderProps): JSX.Element {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {description ? <p className="m-0 mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
