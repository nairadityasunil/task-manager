import { ChevronDown, ChevronRight, Pause, Play, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Button, Card, Input, Select, cn } from '@/components/ui';
import type { Sources } from '@/services/insights';
import {
  LEVEL_COLORS,
  LOG_LEVELS,
  LOG_RANGES,
  observabilityApi,
  type LogFilters,
  type LogLevel,
  type LogRange,
  type LogRow,
} from '@/services/observability';
import { toDisplayErrorMessage } from '@/utils/apiError';

const time = (iso: string, withDate: boolean) => {
  const d = new Date(iso);
  const t = d.toLocaleTimeString(undefined, { hour12: false });
  return withDate
    ? `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${t}`
    : t;
};

export function useIntegration(sources: Sources): [string, (id: string) => void] {
  const [id, setId] = useState(sources.integrations[0]?.id ?? '');
  return [id, setId];
}

export function IntegrationPicker({
  sources,
  value,
  onChange,
}: {
  sources: Sources;
  value: string;
  onChange: (id: string) => void;
}): JSX.Element {
  return (
    <Select
      aria-label="App"
      className="w-56"
      onValueChange={onChange}
      options={sources.integrations.map((i) => ({ value: i.id, label: i.name }))}
      value={value}
    />
  );
}

export function NoApps({ what }: { what: string }): JSX.Element {
  return (
    <EmptyState
      description={`Connect an app under SDK Integrations to see its ${what} here.`}
      icon={ScrollText}
      title="No app connected"
    />
  );
}

function VolumeChart({
  buckets,
  step,
}: {
  buckets: Array<{ t: number } & Record<LogLevel, number>>;
  step: number;
}): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...buckets.map((b) => LOG_LEVELS.reduce((n, l) => n + b[l], 0)));
  const W = 1000;
  const H = 110;
  const bw = W / buckets.length;
  const fmt = (t: number) =>
    new Date(t).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const b = hover != null ? buckets[hover] : null;
  return (
    <div data-testid="log-volume">
      <div className="relative">
        <svg
          aria-label="Log volume over time, stacked by level"
          className="h-28 w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${W} ${H}`}
        >
          {buckets.map((bk, i) => {
            let y = H;
            return (
              <g key={bk.t} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect fill="transparent" height={H} width={bw} x={i * bw} y={0} />
                {LOG_LEVELS.map((l) => {
                  const h = (bk[l] / max) * (H - 4);
                  y -= h;
                  return h > 0 ? (
                    <rect
                      fill={LEVEL_COLORS[l]}
                      height={h}
                      key={l}
                      width={Math.max(1, bw - 1.5)}
                      x={i * bw + 0.75}
                      y={y}
                    />
                  ) : null;
                })}
              </g>
            );
          })}
        </svg>
        {b ? (
          <div
            className="pointer-events-none absolute right-2 top-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow"
            data-testid="log-volume-tooltip"
          >
            <p className="m-0 font-medium text-slate-900">{fmt(b.t)}</p>
            {LOG_LEVELS.filter((l) => b[l] > 0).map((l) => (
              <p className="m-0 text-slate-600" key={l}>
                {l}: {b[l]}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <p className="m-0 mt-1 text-[11px] text-slate-500">
        Each bar covers {step >= 3600000 ? `${step / 3600000} h` : `${step / 60000} min`}.
      </p>
    </div>
  );
}

function Row({
  log,
  withDate,
  onFilter,
}: {
  log: LogRow;
  withDate: boolean;
  onFilter: (f: Partial<{ attr: string; traceId: string }>) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const attrs = Object.entries(log.attributes);
  return (
    <li
      className="border-b border-slate-100 last:border-0"
      data-testid="log-row"
      data-level={log.level}
    >
      <button
        aria-expanded={open}
        className="flex w-full items-start gap-2 border-0 bg-transparent px-3 py-1.5 text-left hover:bg-slate-50"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {open ? (
          <ChevronDown aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <span className="w-[88px] shrink-0 font-mono text-xs text-slate-500">
          {time(log.ts, withDate)}
        </span>
        <span
          className="w-12 shrink-0 text-xs font-semibold uppercase"
          style={{ color: log.level === 'debug' ? '#5b6577' : LEVEL_COLORS[log.level] }}
        >
          {log.level}
        </span>
        <span className="hidden w-24 shrink-0 truncate text-xs text-slate-500 sm:block">
          {log.service}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 text-[13px] text-slate-900',
            open ? 'whitespace-pre-wrap break-words' : 'truncate',
          )}
        >
          {log.message}
        </span>
      </button>
      {open ? (
        <div className="grid gap-1 bg-slate-50 px-9 py-2 text-xs" data-testid="log-detail">
          <p className="m-0 text-slate-500">
            {new Date(log.ts).toISOString()} · service {log.service}
            {log.userIdentifier ? ` · user ${log.userIdentifier}` : ''}
          </p>
          {log.traceId ? (
            <p className="m-0">
              <span className="text-slate-500">trace </span>
              <button
                className="border-0 bg-transparent p-0 font-mono text-brand-600 hover:text-brand-700"
                onClick={() => onFilter({ traceId: log.traceId ?? '' })}
                type="button"
              >
                {log.traceId}
              </button>
              <span className="text-slate-500"> (show every log in this trace)</span>
            </p>
          ) : null}
          {attrs.length ? (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
              {attrs.map(([k, v]) => (
                <div className="contents" key={k}>
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="m-0 break-all text-slate-900">
                    <button
                      className="border-0 bg-transparent p-0 text-left text-slate-900 hover:text-brand-700"
                      onClick={() => onFilter({ attr: `${k}:${String(v)}` })}
                      title="Filter on this value"
                      type="button"
                    >
                      {String(v)}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="m-0 text-slate-500">No attributes.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** Application logs: volume by level, search, filters, attribute and trace drill-down and live tail. */
export function Logs({ sources }: { sources: Sources }): JSX.Element {
  const [integrationId, setIntegrationId] = useIntegration(sources);
  const [range, setRange] = useState<LogRange>('1h');
  const [levels, setLevels] = useState<LogLevel[]>([]);
  const [service, setService] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [attr, setAttr] = useState('');
  const [traceId, setTraceId] = useState('');
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof observabilityApi.logStats>> | null>(
    null,
  );
  const [more, setMore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tail, setTail] = useState(false);
  const newest = useRef<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(text.trim()), 350);
    return () => window.clearTimeout(t);
  }, [text]);

  const filters: LogFilters = useMemo(
    () => ({ integrationId, range, levels, service, q, attr, traceId }),
    [integrationId, range, levels, service, q, attr, traceId],
  );

  useEffect(() => {
    if (!integrationId) return;
    let live = true;
    setLogs(null);
    setError(null);
    void Promise.all([
      observabilityApi.logs(filters, { limit: 100 }),
      observabilityApi.logStats(filters),
    ])
      .then(([page, s]) => {
        if (!live) return;
        setLogs(page.logs);
        setMore(page.hasMore ? page.nextBefore : null);
        newest.current = page.newest;
        setStats(s);
      })
      .catch((e) => {
        if (!live) return;
        setLogs([]);
        setError(toDisplayErrorMessage(e));
      });
    return () => {
      live = false;
    };
  }, [filters, integrationId]);

  // Live tail: ask only for what is newer than the newest log on screen.
  const poll = useCallback(async () => {
    const after = newest.current;
    if (!after) return;
    try {
      const page = await observabilityApi.logs({ ...filters, range: '1h' }, { after, limit: 200 });
      if (page.logs.length) {
        newest.current = page.newest;
        setLogs((cur) => [...page.logs, ...(cur ?? [])].slice(0, 1000));
      }
    } catch {
      /* the next tick tries again */
    }
  }, [filters]);
  useEffect(() => {
    if (!tail) return;
    const id = window.setInterval(() => {
      if (!document.hidden) void poll();
    }, 3000);
    return () => window.clearInterval(id);
  }, [tail, poll]);

  if (!sources.integrations.length) return <NoApps what="logs" />;
  const toggle = (l: LogLevel) =>
    setLevels(levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l]);
  const withDate = range === '7d' || range === '30d' || range === '24h';
  const active = Boolean(levels.length || service || q || attr || traceId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="logs">
      <div className="flex flex-wrap items-center gap-2">
        <IntegrationPicker onChange={setIntegrationId} sources={sources} value={integrationId} />
        <Select
          aria-label="Time range"
          className="w-44"
          onValueChange={(v) => setRange(v as LogRange)}
          options={LOG_RANGES}
          value={range}
        />
        <Select
          aria-label="Service"
          className="w-40"
          onValueChange={(v) => setService(v === '__all' ? '' : v)}
          options={[
            { value: '__all', label: 'All services' },
            ...(stats?.services ?? []).map((s) => ({
              value: s.name,
              label: `${s.name} (${s.count})`,
            })),
          ]}
          value={service || '__all'}
        />
        <div className="min-w-[180px] flex-1">
          <Input
            aria-label="Search logs"
            onChange={(e) => setText(e.target.value)}
            placeholder="Search messages"
            value={text}
          />
        </div>
        <div className="w-44">
          <Input
            aria-label="Filter by attribute"
            onChange={(e) => setAttr(e.target.value.trim())}
            placeholder="attribute  key:value"
            value={attr}
          />
        </div>
        <Button
          aria-pressed={tail}
          icon={tail ? Pause : Play}
          onClick={() => setTail(!tail)}
          variant={tail ? 'primary' : 'secondary'}
        >
          {tail ? 'Stop live tail' : 'Live tail'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Levels">
        {LOG_LEVELS.map((l) => {
          const on = levels.includes(l);
          return (
            <button
              aria-pressed={on}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                on
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
              key={l}
              onClick={() => toggle(l)}
              type="button"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: LEVEL_COLORS[l] }}
              />
              {l}
              <span className="font-mono tabular-nums opacity-70">
                {stats ? stats.byLevel[l] : ''}
              </span>
            </button>
          );
        })}
        {traceId ? (
          <button
            className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-700"
            onClick={() => setTraceId('')}
            type="button"
          >
            trace {traceId} ✕
          </button>
        ) : null}
        {active ? (
          <button
            className="border-0 bg-transparent px-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            onClick={() => {
              setLevels([]);
              setService('');
              setText('');
              setAttr('');
              setTraceId('');
            }}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <Card className="p-3">
        {stats ? (
          <VolumeChart buckets={stats.buckets} step={stats.step} />
        ) : (
          <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
        )}
        {stats?.truncated ? (
          <p
            className="m-0 mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
            role="status"
          >
            Partial counts: only the newest 50,000 matching logs were counted. Narrow the range or
            add a filter.
          </p>
        ) : null}
      </Card>

      {error ? (
        <p
          className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : logs == null ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : !logs.length ? (
        <EmptyState
          compact
          description={
            active
              ? 'No log matches these filters in this time range.'
              : 'Send logs with POST /api/logs from your app (signed like event tracking). They appear here within seconds.'
          }
          icon={ScrollText}
          title={active ? 'Nothing matches' : 'No logs yet'}
        />
      ) : (
        <Card>
          <ul className="m-0 list-none p-0" data-testid="log-list">
            {logs.map((l) => (
              <Row
                key={l.id}
                log={l}
                onFilter={(f) => {
                  if (f.attr) setAttr(f.attr);
                  if (f.traceId) setTraceId(f.traceId);
                }}
                withDate={withDate}
              />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            <span>
              {logs.length} log{logs.length === 1 ? '' : 's'} shown
              {tail ? ' · following new logs' : ''}
            </span>
            {more ? (
              <Button
                onClick={async () => {
                  try {
                    const page = await observabilityApi.logs(filters, { before: more, limit: 100 });
                    setLogs((cur) => [...(cur ?? []), ...page.logs]);
                    setMore(page.hasMore ? page.nextBefore : null);
                  } catch (e) {
                    setError(toDisplayErrorMessage(e));
                  }
                }}
                size="sm"
              >
                Load older
              </Button>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
