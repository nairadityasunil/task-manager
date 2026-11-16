import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/components/ui';
import type {
  FunnelResult,
  Interval,
  PathsResult,
  RetentionResult,
  TrendsResult,
} from '@/services/insights';

/**
 * Charts for Insights. Categorical colours come in a fixed order and follow the
 * series, not its rank; the palette passes the colour-blindness checks against
 * white. Three slots are under 3:1 contrast, so every chart has a legend (two or
 * more series) and a table view.
 */
export const SERIES_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#6250d6',
  '#e34948',
];
const colorOf = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export const fmt = (n: number): string => nf.format(n);
export const compact = (n: number): string =>
  Math.abs(n) >= 10_000
    ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : fmt(n);
export const pct = (r: number): string => `${Math.round(r * 1000) / 10}%`;

export function bucketLabel(t: number, interval: Interval, long = false): string {
  const d = new Date(t);
  if (interval === 'hour')
    return d.toLocaleString(
      undefined,
      long ? { month: 'short', day: 'numeric', hour: 'numeric' } : { hour: 'numeric' },
    );
  if (interval === 'week')
    return `${long ? 'Week of ' : ''}${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  return d.toLocaleDateString(
    undefined,
    long
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric' },
  );
}

export function duration(ms: number | null): string {
  if (ms == null) return '—';
  const s = ms / 1000;
  if (s < 90) return `${Math.round(s)}s`;
  const m = s / 60;
  if (m < 90) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 36) return `${Math.round(h * 10) / 10}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.floor(entry.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Round, readable tick values from 0 to a bit above the max. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export function Legend({
  series,
}: {
  series: Array<{ label: string; color: string; total?: number }>;
}): JSX.Element | null {
  if (series.length < 2) return null;
  return (
    <ul
      className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-slate-600"
      data-testid="chart-legend"
    >
      {series.map((s) => (
        <li className="flex items-center gap-1.5" key={s.label}>
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: s.color }}
          />
          <span className="text-slate-700">{s.label}</span>
          {s.total !== undefined ? (
            <span className="font-mono tabular-nums text-slate-500">{compact(s.total)}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Trends: line and bar                                                 */
/* ------------------------------------------------------------------ */

export function TrendChart({
  result,
  variant,
  height = 260,
}: {
  result: TrendsResult;
  variant: 'line' | 'bar';
  height?: number;
}): JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const series = result.series.map((s, i) => ({ ...s, color: colorOf(i) }));
  const n = result.buckets.length;
  const pad = { l: 44, r: 12, t: 10, b: 26 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const max = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const y = (v: number) => pad.t + h - (v / top) * h;
  const slot = n ? w / n : w;
  const x = (i: number) =>
    pad.l + (variant === 'bar' ? slot * i + slot / 2 : n > 1 ? (w * i) / (n - 1) : w / 2);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 72))));
  // Grouped bars: thin, 2px apart, never wider than 24px.
  const group = Math.min(slot * 0.8, series.length * 26);
  const barW = Math.max(2, Math.min(24, group / Math.max(1, series.length) - 2));

  const onMove = (event: React.MouseEvent<SVGRectElement>) => {
    const box = (event.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = event.clientX - box.left;
    const i = variant === 'bar' ? Math.floor(px / slot) : Math.round((px / w) * Math.max(1, n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="grid gap-2" ref={ref}>
      <Legend series={series.map((s) => ({ label: s.label, color: s.color, total: s.total }))} />
      <div className="relative">
        <svg
          aria-label={`${variant === 'bar' ? 'Bar' : 'Line'} chart of ${series.map((s) => s.label).join(', ')}`}
          height={height}
          role="img"
          width={width}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                stroke="#e2e8f0"
                strokeDasharray={t === 0 ? undefined : '2 4'}
                x1={pad.l}
                x2={pad.l + w}
                y1={y(t)}
                y2={y(t)}
              />
              <text
                className="fill-slate-500 text-[10px]"
                textAnchor="end"
                x={pad.l - 6}
                y={y(t) + 3}
              >
                {compact(t)}
              </text>
            </g>
          ))}
          {result.buckets.map((t, i) =>
            i % labelEvery === 0 ? (
              <text
                className="fill-slate-500 text-[10px]"
                key={t}
                textAnchor={i === 0 ? 'start' : i === result.buckets.length - 1 ? 'end' : 'middle'}
                x={x(i)}
                y={height - 8}
              >
                {bucketLabel(t, result.interval)}
              </text>
            ) : null,
          )}
          {variant === 'bar'
            ? series.map((s, si) =>
                s.points.map((p, i) => {
                  if (p.value <= 0) return null;
                  const bx = x(i) - (series.length * (barW + 2)) / 2 + si * (barW + 2) + 1;
                  const by = y(p.value);
                  const bh = pad.t + h - by;
                  const r = Math.min(4, barW / 2, bh);
                  // Rounded data end, square at the baseline.
                  return (
                    <path
                      d={`M${bx},${pad.t + h} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + barW - r} Q${bx + barW},${by} ${bx + barW},${by + r} V${pad.t + h} Z`}
                      fill={s.color}
                      key={`${s.key}-${i}`}
                      opacity={hover == null || hover === i ? 1 : 0.55}
                    />
                  );
                }),
              )
            : series.map((s) => (
                <g key={s.key}>
                  <polyline
                    fill="none"
                    points={s.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
                    stroke={s.color}
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  {n <= 31
                    ? s.points.map((p, i) => (
                        <circle
                          cx={x(i)}
                          cy={y(p.value)}
                          fill={s.color}
                          key={i}
                          r={hover === i ? 4.5 : 2.5}
                          stroke="#fff"
                          strokeWidth={hover === i ? 2 : 0}
                        />
                      ))
                    : null}
                </g>
              ))}
          {hover != null && variant === 'line' ? (
            <line
              stroke="#94a3b8"
              strokeWidth={1}
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={pad.t + h}
            />
          ) : null}
          <rect
            fill="transparent"
            height={h}
            onMouseLeave={() => setHover(null)}
            onMouseMove={onMove}
            width={w}
            x={pad.l}
            y={pad.t}
          />
        </svg>
        {hover != null ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            data-testid="chart-tooltip"
            style={{ left: Math.min(Math.max(0, x(hover) + 12), width - 180), top: 8 }}
          >
            <div className="mb-1 font-medium text-slate-900">
              {bucketLabel(result.buckets[hover], result.interval, true)}
            </div>
            {series.map((s) => (
              <div className="flex items-center justify-between gap-3" key={s.key}>
                <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="font-mono tabular-nums text-slate-900">
                  {fmt(s.points[hover]?.value ?? 0)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TrendNumber({ result }: { result: TrendsResult }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3" data-testid="trend-number">
      {result.series.map((s, i) => {
        const prev = result.previousTotals?.[i];
        const change = prev ? (s.total - prev) / prev : null;
        return (
          <div className="min-w-0" key={s.key}>
            <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
              {result.series.length > 1 ? (
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: colorOf(i) }}
                />
              ) : null}
              <span className="truncate">{s.label}</span>
            </div>
            <div className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
              {fmt(s.total)}
            </div>
            {change != null ? (
              <div className={cn('mt-1 text-xs', change >= 0 ? 'text-green-800' : 'text-red-700')}>
                {change >= 0 ? '▲' : '▼'} {pct(Math.abs(change))} vs previous period (
                {fmt(prev as number)})
              </div>
            ) : prev === 0 ? (
              <div className="mt-1 text-xs text-slate-500">Nothing in the previous period</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function TrendTable({ result }: { result: TrendsResult }): JSX.Element {
  return (
    <div className="overflow-x-auto" data-testid="trend-table">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>
            <th className="py-1.5 pr-3 font-medium">
              {result.interval === 'hour' ? 'Hour' : result.interval === 'week' ? 'Week' : 'Day'}
            </th>
            {result.series.map((s) => (
              <th className="py-1.5 pr-3 text-right font-medium" key={s.key}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {result.buckets.map((t, i) => (
            <tr key={t}>
              <td className="py-1.5 pr-3 text-slate-600">
                {bucketLabel(t, result.interval, true)}
              </td>
              {result.series.map((s) => (
                <td
                  className="py-1.5 pr-3 text-right font-mono tabular-nums text-slate-900"
                  key={s.key}
                >
                  {fmt(s.points[i]?.value ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200 font-medium">
          <tr>
            <td className="py-1.5 pr-3 text-slate-700">Whole range</td>
            {result.series.map((s) => (
              <td
                className="py-1.5 pr-3 text-right font-mono tabular-nums text-slate-900"
                key={s.key}
              >
                {fmt(s.total)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Funnel                                                               */
/* ------------------------------------------------------------------ */

export function FunnelChart({
  result,
  onStep,
}: {
  result: FunnelResult;
  onStep?: (step: FunnelResult['steps'][number]) => React.ReactNode;
}): JSX.Element {
  const worst = useMemo(() => {
    const later = result.steps.slice(1).filter((s) => s.dropped > 0);
    return later.length
      ? later.reduce((a, b) => (b.conversionFromPrevious < a.conversionFromPrevious ? b : a)).index
      : -1;
  }, [result]);
  return (
    <div className="grid gap-3" data-testid="funnel-chart">
      <div className="text-[13px] text-slate-600">
        <span className="font-semibold text-slate-900">
          {pct(result.entered ? result.converted / result.entered : 0)}
        </span>{' '}
        converted · {fmt(result.converted)} of {fmt(result.entered)} people within{' '}
        {result.windowHours >= 48
          ? `${Math.round(result.windowHours / 24)} days`
          : `${result.windowHours} hours`}
      </div>
      <ol className="m-0 grid list-none gap-2.5 p-0">
        {result.steps.map((s) => (
          <li
            className={cn(
              'rounded-lg border px-3 py-2.5',
              s.index === worst ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200',
            )}
            data-testid="funnel-step"
            key={s.index}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-[13px] font-medium text-slate-900">
                {s.index + 1}. {s.event}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-600">
                {fmt(s.count)} · {pct(s.conversionFromStart)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.max(s.count ? 1 : 0, s.conversionFromStart * 100)}%`,
                  background: SERIES_COLORS[0],
                }}
              />
            </div>
            {s.index > 0 ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{pct(s.conversionFromPrevious)} from the previous step</span>
                <span>{fmt(s.dropped)} dropped off</span>
                <span>median time {duration(s.medianMsFromPrevious)}</span>
                {s.index === worst ? (
                  <span className="font-medium text-amber-800">Biggest drop-off</span>
                ) : null}
                {onStep && s.dropped > 0 ? <span className="ml-auto">{onStep(s)}</span> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Retention                                                            */
/* ------------------------------------------------------------------ */

/** One hue, light to dark; text flips to white on dark cells. */
function cellStyle(v: number): React.CSSProperties {
  const l = 96 - v * 56; // 96% (near white) down to 40%
  return { background: `hsl(213 68% ${l}%)`, color: l < 62 ? '#fff' : '#0f172a' };
}

export function RetentionGrid({ result }: { result: RetentionResult }): JSX.Element {
  const label = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const p = result.period === 'day' ? 'Day' : 'Week';
  return (
    <div className="overflow-x-auto" data-testid="retention-grid">
      <table className="w-full min-w-[520px] border-separate border-spacing-0.5 text-center text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Cohort</th>
            <th className="px-2 py-1 text-right font-medium">People</th>
            {Array.from({ length: result.periods }, (_, i) => (
              <th className="px-2 py-1 font-medium" key={i}>
                {p} {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="font-medium">
            <td className="px-2 py-1.5 text-left text-slate-700">Average</td>
            <td className="px-2 py-1.5 text-right font-mono text-slate-700">
              {fmt(result.cohorts.reduce((s, c) => s + c.size, 0))}
            </td>
            {result.average.map((v, i) => (
              <td
                className="rounded px-2 py-1.5 font-mono tabular-nums"
                key={i}
                style={v == null ? undefined : cellStyle(v)}
              >
                {v == null ? '' : pct(v)}
              </td>
            ))}
          </tr>
          {result.cohorts.map((c) => (
            <tr key={c.start}>
              <td className="px-2 py-1.5 text-left text-slate-600">{label(c.start)}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-600">
                {fmt(c.size)}
              </td>
              {c.values.map((v, i) => (
                <td
                  className="rounded px-2 py-1.5 font-mono tabular-nums"
                  key={i}
                  style={v == null ? { background: '#f8fafc' } : cellStyle(v)}
                  title={v == null ? 'Not over yet' : `${c.counts[i]} of ${c.size} people`}
                >
                  {v == null ? '' : pct(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Paths                                                                */
/* ------------------------------------------------------------------ */

export function PathsView({ result }: { result: PathsResult }): JSX.Element {
  const steps = Array.from({ length: result.depth }, (_, i) =>
    result.edges.filter((e) => e.step === i),
  ).filter((list) => list.length);
  const max = Math.max(1, ...result.edges.map((e) => e.count));
  return (
    <div className="grid gap-3" data-testid="paths-view">
      <div className="text-[13px] text-slate-600">
        {fmt(result.sessions)} sessions · most common next steps
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((edges, i) => (
          <section className="rounded-lg border border-slate-200 p-3" key={i}>
            <h4 className="m-0 mb-2 text-xs font-medium text-slate-500">Step {i + 1}</h4>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {edges.map((e) => (
                <li className="text-xs" data-testid="path-edge" key={`${e.from}>${e.to}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1 text-slate-700">
                      <span className="truncate">{e.from}</span>
                      <ArrowRight aria-hidden className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate font-medium text-slate-900">{e.to}</span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-slate-600">
                      {fmt(e.count)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-slate-100">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${(e.count / max) * 100}%`, background: SERIES_COLORS[0] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
