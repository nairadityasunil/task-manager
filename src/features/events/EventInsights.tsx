import { useEffect, useState } from 'react';
import { Bookmark, TrendingUp, X } from 'lucide-react';

import { Button, cn } from '@/components/ui';
import { usePrompt } from '@/context/ConfirmationContext';
import { CreateTaskButton } from '@/features/tasks/components/CreateTaskFromInsight';
import api from '@/services/api';

export interface EventViewFilters {
  eventNames: string[];
  startDate: string;
  endDate: string;
}

interface SavedView {
  id: string;
  name: string;
  filters: EventViewFilters;
}

interface Trend {
  days: Array<{ date: string; count: number }>;
  spikes: Array<{ eventName: string; last24h: number; dailyAverage: number; ratio: number }>;
}

const viewsKey = (scope: string) => `pristine.events.views.${scope}`;

function readViews(scope: string): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(viewsKey(scope)) ?? '[]') as SavedView[];
  } catch {
    return [];
  }
}

/**
 * Above the event log: a 14-day trend, events that jumped in the last 24 hours (each can become a task),
 * and saved filter views.
 */
export function EventInsights({
  scope,
  sdkIntegrationId,
  apiKeyId,
  filters,
  onApplyView,
  linkBack
}: {
  /** Key for saved views (the integration or analytics key id). */
  scope: string;
  sdkIntegrationId?: string;
  apiKeyId?: string;
  filters: EventViewFilters;
  onApplyView: (filters: EventViewFilters) => void;
  /** Portal path of this event view, used as the task's link back. */
  linkBack: string;
}): JSX.Element {
  const askName = usePrompt();
  const [trend, setTrend] = useState<Trend | null>(null);
  const [views, setViews] = useState<SavedView[]>(() => readViews(scope));

  useEffect(() => setViews(readViews(scope)), [scope]);

  const eventKey = filters.eventNames.join(',');
  useEffect(() => {
    let cancelled = false;
    api
      .get('/analytics/events/trend', {
        params: { days: 14, sdkIntegrationId, apiKeyId: sdkIntegrationId ? undefined : apiKeyId, eventNames: eventKey || undefined },
        silent: true
      })
      .then((response) => !cancelled && setTrend(response.data as Trend))
      .catch(() => !cancelled && setTrend(null));
    return () => {
      cancelled = true;
    };
  }, [sdkIntegrationId, apiKeyId, eventKey]);

  const persist = (next: SavedView[]) => {
    setViews(next);
    try {
      localStorage.setItem(viewsKey(scope), JSON.stringify(next));
    } catch {
      /* storage unavailable: kept for this visit */
    }
  };

  const saveView = async () => {
    const suggested = filters.eventNames.length ? filters.eventNames.join(', ') : 'All events';
    const name = await askName({ title: 'Save this view', label: 'Name', defaultValue: suggested, confirmText: 'Save', optional: false });
    if (!name) return;
    persist([...views.filter((view) => view.name !== name), { id: crypto.randomUUID(), name, filters }]);
  };

  const max = Math.max(...(trend?.days.map((day) => day.count) ?? [0]), 1);
  const total = trend?.days.reduce((sum, day) => sum + day.count, 0) ?? 0;
  const sameFilters = (a: EventViewFilters) =>
    a.eventNames.join(',') === filters.eventNames.join(',') && a.startDate === filters.startDate && a.endDate === filters.endDate;

  return (
    <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-5" data-testid="event-insights">
      <div className="flex flex-wrap items-center gap-2" data-testid="saved-views">
        <span className="text-xs font-medium text-slate-500">Views</span>
        {views.map((view) => (
          <span
            className={cn(
              'inline-flex h-7 items-center rounded-md border text-[12px]',
              sameFilters(view.filters) ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700'
            )}
            key={view.id}
          >
            <button className="h-full px-2.5" data-testid="saved-view" onClick={() => onApplyView(view.filters)} type="button">
              {view.name}
            </button>
            <button
              aria-label={`Delete view ${view.name}`}
              className="grid h-full w-6 place-items-center text-slate-400 hover:text-slate-700"
              onClick={() => persist(views.filter((item) => item.id !== view.id))}
              type="button"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <Button icon={Bookmark} onClick={() => void saveView()} size="sm" variant="ghost">
          Save view
        </Button>
      </div>

      {trend ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-slate-800">Last 14 days{filters.eventNames.length ? ` · ${filters.eventNames.join(', ')}` : ''}</span>
              <span className="font-mono text-xs text-slate-500">{total.toLocaleString()} events</span>
            </div>
            <div aria-label="Events per day" className="mt-2 flex h-16 items-end gap-1" data-testid="event-trend" role="img">
              {trend.days.map((day) => (
                <div className="flex h-full flex-1 items-end" key={day.date} title={`${day.date}: ${day.count.toLocaleString()} events`}>
                  <div className="w-full rounded-sm bg-brand-500/80" style={{ height: `${Math.max(day.count ? 6 : 2, (day.count / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
              <span>{trend.days[0]?.date.slice(5)}</span>
              <span>today</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
              <TrendingUp size={14} /> Spikes in the last 24 hours
            </div>
            {trend.spikes.length === 0 ? (
              <p className="m-0 mt-1.5 text-[13px] text-slate-500">Nothing unusual.</p>
            ) : (
              <ul className="m-0 mt-1.5 grid list-none gap-1.5 p-0" data-testid="event-spikes">
                {trend.spikes.map((spike) => (
                  <li className="flex items-center justify-between gap-2 text-[13px]" key={spike.eventName}>
                    <span className="min-w-0 truncate">
                      <code className="font-mono text-[12px] text-slate-900">{spike.eventName}</code>
                      <span className="ml-1.5 text-slate-500">
                        {spike.last24h.toLocaleString()} vs ~{spike.dailyAverage}/day
                      </span>
                    </span>
                    <CreateTaskButton
                      insight={{
                        title: `Investigate spike in ${spike.eventName}`,
                        summary: `${spike.eventName} fired ${spike.last24h.toLocaleString()} times in the last 24 hours, about ${spike.ratio}× its usual ${spike.dailyAverage} per day.`,
                        source: `Event · ${spike.eventName}`,
                        link: linkBack,
                        priority: spike.ratio >= 5 ? 'HIGH' : 'MEDIUM'
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
