import type { ReactNode } from 'react';
import type { TaskSummary } from '@/types/task';

interface DaySummaryProps {
  controls?: ReactNode;
  date: string;
  error?: string | null;
  loading?: boolean;
  summary: TaskSummary | null;
}


function DaySummary({ controls = null, date, error = null, loading = false, summary }: DaySummaryProps): JSX.Element {
  const metrics = summary
    ? [
        { label: 'Total',       value: summary.total },
        { label: 'Pending',     value: summary.todo },
        { label: 'In progress', value: summary.inProgress },
        { label: 'In review',   value: summary.inReview },
        { label: 'Completed',   value: summary.done },
        { label: 'Rolled over', value: summary.rolledOver },
      ]
    : [];

  return (
    <div className="grid gap-3.5 h-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <h2 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Daily summary</h2>
          <p className="m-0 text-[13px] text-slate-500">{date}</p>
        </div>
        {controls ? <div className="shrink-0 max-w-full">{controls}</div> : null}
      </div>

      {loading ? <p className="m-0 text-[13px] text-slate-500">Refreshing summary for {date}...</p> : null}
      {error ? <p className="m-0 text-[13px] text-red-600">{error}</p> : null}

      {/* Metric grid */}
      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <article
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="text-[13px] text-slate-500">
                {label}
              </span>
              <strong className="mt-1 block text-2xl font-semibold tabular-nums text-slate-900">
                {value}
              </strong>
            </article>
          ))}
        </div>
      ) : !loading && !error ? (
        <p className="m-0 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-[13px] text-slate-500">
          No summary is available until tasks exist for this date.
        </p>
      ) : null}
    </div>
  );
}

export default DaySummary;