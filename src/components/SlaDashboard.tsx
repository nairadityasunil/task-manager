import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, TimerReset } from 'lucide-react';

import { getSlaAnalytics } from '@/services/sla';
import type { SlaAnalyticsSummary } from '@/types/task';
import { cn } from '@/components/ui';

function SlaDashboard(): JSX.Element | null {
  const [summary, setSummary] = useState<SlaAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSlaAnalytics()
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
  }, []);

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
    { label: 'Avg resolve', value: `${summary.averageResolutionTimeHours}h`, icon: TimerReset, valueTone: 'text-slate-900', dot: 'bg-amber-500' }
  ];

  return (
    <div className="@container">
      <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 @lg:grid-cols-4">
        {items.map((item) => (
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2.5" key={item.label}>
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
