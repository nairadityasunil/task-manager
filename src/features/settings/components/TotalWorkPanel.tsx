import { Building2, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, CardHeader, cn } from '@/components/ui';
import { dayLabel, formatDuration, shiftDay, todayIso } from '@/features/projects/components/time';
import { getMyWeek, type MyWeek } from '@/services/time';

import { DonutChart } from './DonutChart';

/** One distinct colour per project in the chart (in order, so neighbouring arcs never match). */
const CHART_COLORS = ['#3e50d8', '#0e7490', '#c2410c', '#2f7d4f', '#b4416e', '#a16207', '#6d5bd0', '#57534e'];

/** Monday of the week a day (YYYY-MM-DD) falls in. */
const mondayOf = (day: string): string => {
  const d = new Date(`${day}T00:00:00Z`);
  return shiftDay(day, -((d.getUTCDay() + 6) % 7));
};

const hours = (minutes: number): string => formatDuration(minutes) || '0h';

/**
 * "Total work": the signed-in person's logged time for a week, per project and per day, with a total.
 * Weeks can be browsed back in time (never forward). Projects with no time that week are not listed.
 */
export function TotalWorkPanel(): JSX.Element {
  const navigate = useNavigate();
  const [start, setStart] = useState(() => mondayOf(todayIso()));
  const [week, setWeek] = useState<MyWeek | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    setLoading(true);
    try {
      const result = await getMyWeek(start);
      if (mine !== latest.current) return;
      setWeek(result);
      setError(false);
    } catch {
      if (mine === latest.current) setError(true);
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }, [start]);

  useEffect(() => {
    void load();
  }, [load]);

  const thisMonday = mondayOf(todayIso());
  const isThisWeek = start === thisMonday;
  const canGoNext = start < thisMonday;
  const days = week?.days ?? Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const range = `${dayLabel(days[0]).date} – ${dayLabel(days[6]).date}`;
  const workspaces = week?.workspaces ?? [];
  // One arc per project (a project belongs to one workspace, so none repeats), most time first.
  const chartSegments = (week?.projects ?? []).map((p, i) => ({ id: p.projectId, label: p.name, value: p.minutes, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const total = week?.totalMinutes ?? 0;

  const arrow = 'grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

  return (
    <Card data-testid="total-work">
      <CardHeader
        description="The time you logged in each workspace and project, week by week. This does not depend on the workspace you have open."
        icon={<Clock className="h-4 w-4 text-slate-500" />}
        title="Total work"
      />
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button aria-label="Previous week" className={arrow} data-testid="work-prev" onClick={() => setStart(shiftDay(start, -7))} type="button">
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Next week" className={arrow} data-testid="work-next" disabled={!canGoNext} onClick={() => canGoNext && setStart(shiftDay(start, 7))} title={canGoNext ? undefined : 'This is the current week'} type="button">
              <ChevronRight size={16} />
            </button>
            <span className="ml-1 text-sm font-semibold text-slate-900" data-testid="work-range">
              {range}
            </span>
            {!isThisWeek ? (
              <Button data-testid="work-this-week" onClick={() => setStart(thisMonday)} size="sm" variant="secondary">
                This week
              </Button>
            ) : null}
          </div>
          <div className="text-right" data-testid="work-total">
            <div className="text-xs text-slate-500">{isThisWeek ? 'Total this week' : 'Total for this week'}</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900">{hours(total)}</div>
          </div>
        </div>

        {error ? (
          <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
            Could not load your time.{' '}
            <button className="font-medium underline" onClick={() => void load()} type="button">
              Try again
            </button>
          </p>
        ) : loading && !week ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your time…
          </div>
        ) : (
          <div className={cn('grid gap-4', loading && 'opacity-60')}>
            {chartSegments.length > 0 ? (
              <section className="rounded-lg border border-slate-200 p-4" data-testid="work-chart">
                <h4 className="m-0 mb-3 text-[13px] font-semibold text-slate-900">Time by project</h4>
                <DonutChart centerLabel={isThisWeek ? 'this week' : 'that week'} centerValue={hours(total)} formatValue={hours} segments={chartSegments} />
              </section>
            ) : null}
            {workspaces.map((w) => (
              <section className="overflow-hidden rounded-lg border border-slate-200" data-testid="work-workspace" key={w.workspaceId ?? 'none'}>
                <div className="flex items-center justify-between gap-3 bg-slate-50/70 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Building2 aria-hidden className="shrink-0 text-slate-400" size={15} />
                    <h4 className="m-0 truncate text-[13px] font-semibold text-slate-900" data-testid="work-workspace-name">
                      {w.name}
                    </h4>
                  </div>
                  <span className={cn('shrink-0 text-[13px] font-semibold tabular-nums', w.minutes ? 'text-slate-900' : 'font-normal text-slate-400')} data-testid="work-workspace-total">
                    {hours(w.minutes)}
                  </span>
                </div>
                {w.projects.length === 0 ? (
                  <p className="m-0 border-t border-slate-100 px-3 py-3 text-[13px] text-slate-500" data-testid="work-workspace-empty">
                    No time logged in this workspace {isThisWeek ? 'this week' : 'that week'}.
                  </p>
                ) : (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full min-w-[720px] table-fixed border-collapse text-[13px]" data-testid="work-table">
                      <colgroup>
                        <col className="w-[30%]" />
                        {days.map((d) => (
                          <col key={d} />
                        ))}
                        <col className="w-[92px]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-slate-100 text-left">
                          <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Project</th>
                          {days.map((d) => (
                            <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500" key={d}>
                              {dayLabel(d).weekday}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {w.projects.map((p) => (
                          <tr data-testid="work-row" key={p.projectId}>
                            <td className="max-w-[260px] px-3 py-2.5">
                              <button className="block max-w-full truncate text-left font-medium text-slate-900 hover:underline" onClick={() => navigate(`/projects/${p.projectId}`)} title={p.name} type="button">
                                {p.name}
                              </button>
                              <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${w.minutes ? Math.max(3, Math.round((p.minutes / w.minutes) * 100)) : 0}%` }} />
                              </div>
                            </td>
                            {p.byDay.map((m, i) => (
                              <td className={cn('px-2 py-2.5 text-center tabular-nums', m ? 'text-slate-800' : 'text-slate-300')} key={days[i]}>
                                {m ? formatDuration(m) : '–'}
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900" data-testid="work-row-total">
                              {hours(p.minutes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
            {total > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/60" data-testid="work-grand-total">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col className="w-[30%]" />
                    {days.map((d) => (
                      <col key={d} />
                    ))}
                    <col className="w-[92px]" />
                  </colgroup>
                  <tbody>
                    <tr className="font-semibold text-slate-900">
                      <td className="px-3 py-2.5">All workspaces</td>
                      {(week?.totalByDay ?? []).map((m, i) => (
                        <td className={cn('px-2 py-2.5 text-center tabular-nums', !m && 'font-normal text-slate-300')} key={days[i]}>
                          {m ? formatDuration(m) : '–'}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right tabular-nums">{hours(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

export default TotalWorkPanel;
