import { useEffect, useRef, useState } from 'react';
import { Bot, Cpu, FileText, Search, User } from 'lucide-react';

import { Card, CardHeader, cn } from '@/components/ui';
import { getAiTraffic, type AiTrafficReport } from '@/lib/sdk-integrations/api';
import { toDisplayErrorMessage } from '@/utils/apiError';

const RANGES = [7, 30, 90] as const;

const TILES = [
  { key: 'human', label: 'People', icon: User, hint: 'Ordinary browsers' },
  { key: 'ai_agent', label: 'AI agents', icon: Bot, hint: 'ChatGPT, Claude, Perplexity and others browsing for someone' },
  { key: 'automated', label: 'Automated browsers', icon: Cpu, hint: 'Headless or remote-controlled, unnamed' },
  { key: 'crawler', label: 'Crawlers', icon: Search, hint: 'Search engines, link previews, SEO tools' }
] as const;

const plural = (n: number, word: string): string => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

const pct = (part: number, whole: number): string => (whole > 0 ? `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%` : '0%');

/** AI agent events per day: one series, one hue; hover for the day's mix. */
function AiDailyChart({ report }: { report: AiTrafficReport }): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...report.daily.map((d) => d.aiAgent), 1);
  const active = hover == null ? null : report.daily[hover];
  return (
    <div className="p-4">
      <div className="relative h-32" onMouseLeave={() => setHover(null)}>
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
        <span className="pointer-events-none absolute -top-2 left-0 z-[1] bg-white pr-1 text-[11px] tabular-nums text-slate-400">{max}</span>
        <div aria-label="AI agent events per day" className="absolute inset-0 flex items-end gap-[2px]" role="img">
          {report.daily.map((day, index) => (
            <button
              aria-label={`${day.date}: ${day.aiAgent} AI agent events of ${day.human + day.aiAgent + day.automated + day.crawler}`}
              className="flex h-full min-w-0 flex-1 items-end focus:outline-none"
              key={day.date}
              onBlur={() => setHover(null)}
              onFocus={() => setHover(index)}
              onMouseEnter={() => setHover(index)}
              type="button"
            >
              <span
                className={cn('block w-full rounded-t-[4px]', day.aiAgent ? (hover === index ? 'bg-violet-600' : 'bg-violet-500') : 'bg-slate-100')}
                style={{ height: day.aiAgent ? `${Math.max(3, (day.aiAgent / max) * 100)}%` : '2px' }}
              />
            </button>
          ))}
        </div>
        {active ? (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
            data-testid="traffic-tooltip"
            style={{ left: `clamp(5rem, ${((hover! + 0.5) / report.daily.length) * 100}%, calc(100% - 5rem))` }}
          >
            <div className="font-medium text-slate-900">
              {new Date(`${active.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </div>
            <div className="tabular-nums text-slate-600">
              {active.aiAgent} AI agents · {active.human} people
              {active.automated ? ` · ${active.automated} automated` : ''}
              {active.crawler ? ` · ${active.crawler} crawlers` : ''}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
        <span>{report.daily[0]?.date.slice(5)}</span>
        <span>{report.daily[report.daily.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function AiTrafficPanel({ sdkIntegrationId }: { sdkIntegrationId: string }): JSX.Element {
  const [days, setDays] = useState<number>(30);
  const [report, setReport] = useState<AiTrafficReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setReport(null);
    setError(null);
    getAiTraffic(sdkIntegrationId, days)
      .then((next) => id === requestId.current && setReport(next))
      .catch((err) => id === requestId.current && setError(toDisplayErrorMessage(err)));
  }, [sdkIntegrationId, days]);

  const classified = report ? TILES.reduce((sum, tile) => sum + report.totals[tile.key].events, 0) : 0;
  const agentTotal = report ? report.agents.reduce((sum, a) => sum + a.events, 0) : 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="m-0 text-[15px] font-semibold text-slate-900">AI traffic</h2>
          <p className="m-0 mt-0.5 text-[13px] text-slate-500">
            How much of this app&apos;s traffic comes from AI agents browsing for someone, other automation and crawlers.
          </p>
        </div>
        <div aria-label="Period" className="flex gap-1.5" role="group">
          {RANGES.map((range) => (
            <button
              aria-pressed={range === days}
              className={cn(
                'h-8 rounded-lg border px-2.5 text-[13px] font-medium transition-colors',
                range === days ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
              key={range}
              onClick={() => setDays(range)}
              type="button"
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="m-0 rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{error}</p> : null}
      {!report && !error ? <div className="h-64 animate-pulse rounded-xl bg-slate-100" /> : null}

      {report ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="traffic-tiles">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              const total = report.totals[tile.key];
              return (
                <Card className="p-4" key={tile.key}>
                  <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    {tile.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{pct(total.events, classified)}</div>
                  <div className="text-xs tabular-nums text-slate-500">
                    {plural(total.events, 'event')} · {plural(total.sessions, 'session')}
                  </div>
                  <p className="m-0 mt-1.5 text-[11px] leading-snug text-slate-400">{tile.hint}</p>
                </Card>
              );
            })}
          </div>
          {report.totals.unclassified.events > 0 ? (
            <p className="m-0 text-xs text-slate-500">
              {plural(report.totals.unclassified.events, 'earlier event')} {report.totals.unclassified.events === 1 ? 'was' : 'were'} recorded before traffic was
              classified and {report.totals.unclassified.events === 1 ? 'is' : 'are'} left out of the shares.
            </p>
          ) : null}

          <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader description={`AI agent events per day, last ${report.days} days`} title="AI agents over time" />
              <AiDailyChart report={report} />
            </Card>
            <Card data-testid="traffic-agents">
              <CardHeader description="Named AI agents and crawlers" title="Who" />
              {report.agents.length === 0 ? (
                <p className="m-0 p-4 text-[13px] text-slate-500">No AI agents or crawlers in this period.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                  {report.agents.slice(0, 8).map((row) => (
                    <li className="px-4 py-2.5" key={`${row.type}:${row.agent}`}>
                      <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate font-medium text-slate-800">
                          {row.agent}
                          <span className="ml-1.5 text-xs font-normal text-slate-400">{row.type === 'ai_agent' ? 'AI agent' : 'Crawler'}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-600">{row.events.toLocaleString()}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', row.type === 'ai_agent' ? 'bg-violet-500' : 'bg-slate-400')}
                          style={{ width: `${Math.max(1, (row.events / Math.max(agentTotal, 1)) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card data-testid="traffic-pages">
            <CardHeader
              description="What AI agents read: worth keeping accurate, since their answers quote it."
              icon={<FileText className="h-4 w-4 shrink-0 text-slate-400" />}
              title="Pages AI agents visit"
            />
            {report.aiPages.length === 0 ? (
              <p className="m-0 p-4 text-[13px] text-slate-500">No pages visited by AI agents in this period.</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                {report.aiPages.map((page) => (
                  <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]" key={page.url}>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs text-slate-700">{page.url}</span>
                      <span className="text-xs text-slate-400">{page.agents.join(', ') || 'Unnamed agents'}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">{page.events.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
