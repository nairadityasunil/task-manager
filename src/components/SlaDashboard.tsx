import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, TimerReset } from 'lucide-react';

import { getSlaAnalytics } from '@/services/sla';
import type { SlaAnalyticsSummary } from '@/types/task';
import { cn } from '@/components/ui';

interface SlaDashboardProps {
  /** The project the screen is about: the numbers cover only its tasks. */
  projectId?: string | null;
  /** Used when no project is open: the numbers cover the projects of this workspace. */
  workspaceId?: string | null;
  /** False when the open project has SLA tracking off: nothing is shown and nothing is fetched. */
  enabled?: boolean;
  /** Changes whenever the tasks on screen change (created, moved, finished...), so the numbers are fetched again. */
  refreshKey?: unknown;
}

function SlaDashboard({ projectId, workspaceId, refreshKey, enabled = true }: SlaDashboardProps): JSX.Element | null {
  const [summary, setSummary] = useState<SlaAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const scope = `${projectId ?? ''}|${projectId ? '' : (workspaceId ?? '')}`;
  const shownScope = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    // Another project or workspace: never keep showing the previous one's numbers while the new ones load.
    if (shownScope.current !== scope) {
      shownScope.current = scope;
      setSummary(null);
      setLoading(true);
    }
    getSlaAnalytics({ projectId: projectId || undefined, workspaceId: projectId ? undefined : workspaceId || undefined })
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [scope, refreshKey, enabled]);

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="@container">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 @lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="grid gap-2 bg-white px-3 py-2.5" key={i}>
              <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-10 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const items = [
    {
      label: 'Breached',
      value: summary.totalBreached,
      icon: AlertTriangle,
      valueTone: summary.totalBreached > 0 ? 'text-red-600' : 'text-slate-900',
      dot: summary.totalBreached > 0 ? 'bg-red-500' : 'bg-emerald-500'
    },
    { label: 'Response', value: `${summary.responseCompliancePercent}%`, icon: CheckCircle2, valueTone: 'text-slate-900', dot: 'bg-emerald-500' },
    { label: 'Resolution', value: `${summary.resolutionCompliancePercent}%`, icon: BarChart3, valueTone: 'text-slate-900', dot: 'bg-sky-500' },
    {
      label: 'Avg resolve',
      // The average of the time people logged on resolved tasks: with none logged there is nothing to show.
      value: summary.resolvedTasksWithTime === 0 ? '–' : `${summary.averageResolutionTimeHours}h`,
      hint: 'Average time logged on resolved tasks',
      icon: TimerReset,
      valueTone: summary.resolvedTasksWithTime === 0 ? 'text-slate-400' : 'text-slate-900',
      dot: 'bg-amber-500'
    }
  ];

  return (
    <div className="@container">
      <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 @lg:grid-cols-4">
        {items.map((item) => (
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2.5" key={item.label} title={'hint' in item ? item.hint : undefined}>
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', item.dot)} />
                <span className="truncate">{item.label}</span>
              </dt>
              <dd className={cn('m-0 mt-0.5 text-base font-semibold tabular-nums', item.valueTone)}>{item.value}</dd>
            </div>
            <item.icon className="hidden shrink-0 text-slate-300 @sm:block" size={16} />
          </div>
        ))}
      </dl>
    </div>
  );
}

export default SlaDashboard;
