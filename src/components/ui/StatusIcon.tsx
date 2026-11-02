import { cn } from './cn';

export type StatusIconValue = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | 'rolled_over';

const LABELS: Record<StatusIconValue, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To do',
  rolled_over: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  BLOCKED: 'Blocked',
  DONE: 'Done'
};

/**
 * A task's status as a small ring: empty for to do, filling as work moves on,
 * dashed for blocked, a tick for done. Colour is never the only signal.
 */
export function StatusIcon({ status, size = 14, className }: { status: StatusIconValue; size?: number; className?: string }): JSX.Element {
  const label = LABELS[status] ?? status;
  const box = { width: size, height: size };
  if (status === 'DONE') {
    return (
      <span aria-label={label} className={cn('inline-grid shrink-0 place-items-center rounded-full bg-slate-600', className)} role="img" style={box}>
        <svg aria-hidden fill="none" height={size * 0.62} stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" viewBox="0 0 24 24" width={size * 0.62}>
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
    );
  }
  if (status === 'BLOCKED') {
    return <span aria-label={label} className={cn('inline-block shrink-0 rounded-full border-[1.5px] border-dashed border-amber-700', className)} role="img" style={box} />;
  }
  if (status === 'IN_PROGRESS' || status === 'IN_REVIEW') {
    const fill = status === 'IN_REVIEW' ? 75 : 50;
    return (
      <span
        aria-label={label}
        className={cn('inline-block shrink-0 rounded-full border-[1.5px] border-brand-600', className)}
        role="img"
        style={{ ...box, background: `conic-gradient(var(--color-brand-600) 0 ${fill}%, transparent 0)` }}
      />
    );
  }
  return (
    <span
      aria-label={label}
      className={cn('inline-block shrink-0 rounded-full border-[1.5px]', status === 'BACKLOG' ? 'border-dotted border-slate-400' : 'border-slate-400', className)}
      role="img"
      style={box}
    />
  );
}

export const statusLabel = (status: StatusIconValue): string => LABELS[status] ?? status;
