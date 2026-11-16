import { AlertTriangle } from 'lucide-react';

import { CreateTaskButton } from '@/features/tasks/components/CreateTaskFromInsight';
import type { QueryResult, Visualization } from '@/services/insights';

import {
  FunnelChart,
  PathsView,
  RetentionGrid,
  TrendChart,
  TrendNumber,
  TrendTable,
  pct,
} from './charts';

/** Draws any query result. Trends follow the chosen visualization; the others have one form each. */
export function ResultView({
  result,
  visualization,
  height,
  insightName,
  link,
}: {
  result: QueryResult;
  visualization: Visualization;
  height?: number;
  insightName?: string;
  link?: string;
}): JSX.Element {
  const empty =
    result.kind === 'trends'
      ? result.series.every((s) => s.total === 0)
      : result.kind === 'funnel'
        ? result.entered === 0
        : result.kind === 'retention'
          ? result.cohorts.length === 0
          : result.edges.length === 0;
  return (
    <div className="grid gap-3">
      {result.truncated ? (
        <p
          className="m-0 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
          role="status"
        >
          <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> Partial result: only the most recent
          200,000 events in this range were read. Choose a shorter range for exact numbers.
        </p>
      ) : null}
      {empty ? (
        <p
          className="m-0 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-500"
          data-testid="result-empty"
        >
          No data for this query in the selected time range.
        </p>
      ) : result.kind === 'trends' ? (
        visualization === 'number' ? (
          <TrendNumber result={result} />
        ) : visualization === 'table' ? (
          <TrendTable result={result} />
        ) : (
          <TrendChart
            height={height}
            result={result}
            variant={visualization === 'bar' ? 'bar' : 'line'}
          />
        )
      ) : result.kind === 'funnel' ? (
        <FunnelChart
          onStep={(step) => (
            <CreateTaskButton
              insight={{
                title: `Reduce drop-off at "${step.event}"${insightName ? ` in ${insightName}` : ''}`,
                summary: `${step.dropped} of ${result.steps[step.index - 1].count} people (${pct(1 - step.conversionFromPrevious)}) did not go on from "${result.steps[step.index - 1].event}" to "${step.event}".`,
                source: `Funnel${insightName ? ` · ${insightName}` : ''}`,
                link: link ?? '/insights',
              }}
              label="Create task"
            />
          )}
          result={result}
        />
      ) : result.kind === 'retention' ? (
        <RetentionGrid result={result} />
      ) : (
        <PathsView result={result} />
      )}
    </div>
  );
}
