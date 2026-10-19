import { Clock3, PauseCircle, ShieldAlert } from 'lucide-react';

import type { Task, TaskSlaState } from '@/types/task';
import { cn } from '@/components/ui';

interface SlaIndicatorProps {
  compact?: boolean;
  task: Task;
}

const stateMeta: Record<TaskSlaState, { label: string; text: string; dot: string; bar: string }> = {
  HEALTHY: { label: 'Healthy', text: 'text-slate-600', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  NEAR_BREACH: { label: 'Near breach', text: 'text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  BREACHED: { label: 'Breached', text: 'text-red-700', dot: 'bg-red-500', bar: 'bg-red-500' },
  PAUSED: { label: 'Paused', text: 'text-slate-500', dot: 'bg-slate-400', bar: 'bg-slate-400' },
  COMPLETED: { label: 'Completed', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' }
};

const formatRemaining = (dueAt: string | null): string => {
  if (!dueAt) return 'No SLA';
  const ms = new Date(dueAt).getTime() - Date.now();
  if (ms <= 0) return 'Breached';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)}d`;
};

const progressPercent = (task: Task): number => {
  if (!task.slaResolutionDueAt || !task.slaResponseDueAt) return 0;
  const created = new Date(task.assignedAt).getTime();
  const due = new Date(task.slaResolutionDueAt).getTime();
  const total = Math.max(1, due - created);
  const elapsed = Math.max(0, Date.now() - created - (task.totalPausedDuration ?? 0));
  return Math.min(100, Math.round((elapsed / total) * 100));
};

function SlaIndicator({ compact = false, task }: SlaIndicatorProps): JSX.Element {
  const state = task.currentSlaState ?? 'HEALTHY';
  const breached = task.responseBreached || task.resolutionBreached;
  const remaining = formatRemaining(task.slaResolutionDueAt);
  const pct = progressPercent(task);
  const meta = breached ? stateMeta.BREACHED : stateMeta[state] ?? stateMeta.HEALTHY;
  const showRemaining = state !== 'COMPLETED' && state !== 'PAUSED' && remaining !== 'Breached' && remaining !== 'No SLA';
  const Icon = state === 'PAUSED' ? PauseCircle : breached ? ShieldAlert : Clock3;

  if (compact) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', meta.text)}
        title={`SLA ${stateMeta[state]?.label ?? state} · Resolution ${remaining}`}
      >
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {stateMeta[state]?.label ?? state}
        {showRemaining ? <span className="font-normal tabular-nums text-slate-500">· {remaining}</span> : null}
      </span>
    );
  }

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', meta.text)}>
        <Icon className="shrink-0" size={13} />
        <span>{stateMeta[state]?.label ?? state}</span>
        <span className="ml-auto font-normal tabular-nums text-slate-500">Resolution {remaining}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all', meta.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default SlaIndicator;
