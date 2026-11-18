import { useMemo, useState } from 'react';

import { cn } from '@/components/ui';
import { SERIES_COLORS, compact, fmt } from '@/features/insights/charts';

export interface Series {
  name: string;
  values: number[];
  /** Index into the shared colour order, so a series keeps its colour. */
  color?: number;
  format?: (n: number) => string;
}

const dayText = (d: string): string => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * A line chart over days: thin 2px lines, a light grid, a crosshair with a tooltip on hover or focus,
 * and a legend (names, not just colours) whenever there are two or more series.
 */
export function DayChart({ days, series, height = 180, area = false, ariaLabel }: { days: string[]; series: Series[]; height?: number; area?: boolean; ariaLabel: string }): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const pad = { l: 40, r: 10, t: 10, b: 22 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = (() => {
    const mag = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / mag) * mag;
  })();
  const x = (i: number): number => pad.l + (days.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (days.length - 1));
  const y = (v: number): number => pad.t + (1 - v / niceMax) * (height - pad.t - pad.b);
  const ticks = [0, niceMax / 2, niceMax];
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));
  const fmtFor = (s: Series) => s.format ?? compact;

  const paths = useMemo(
    () => series.map((s) => s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')),
    [series, days.length, niceMax, height]
  );

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          aria-label={ariaLabel}
          className="block h-auto w-full"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (days.length - 1));
            setHover(Math.min(days.length - 1, Math.max(0, i)));
          }}
          role="img"
          viewBox={`0 0 ${W} ${height}`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line stroke="var(--color-slate-200, #e2e8f0)" strokeWidth={1} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
              <text fill="var(--color-slate-500, #64748b)" fontSize={10} textAnchor="end" x={pad.l - 6} y={y(t) + 3}>
                {compact(Math.round(t * 100) / 100)}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === 0 ? (
              <text fill="var(--color-slate-500, #64748b)" fontSize={10} key={d} textAnchor="middle" x={x(i)} y={height - 6}>
                {dayText(d)}
              </text>
            ) : null
          )}
          {area && series[0] ? (
            <path d={`${paths[0]} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={SERIES_COLORS[series[0].color ?? 0]} opacity={0.1} />
          ) : null}
          {series.map((s, idx) => (
            <path d={paths[idx]} fill="none" key={s.name} stroke={SERIES_COLORS[s.color ?? idx]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          ))}
          {hover != null ? (
            <g>
              <line stroke="var(--color-slate-400, #94a3b8)" strokeDasharray="3 3" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} />
              {series.map((s, idx) => (
                <circle cx={x(hover)} cy={y(s.values[hover])} fill="#fff" key={s.name} r={4} stroke={SERIES_COLORS[s.color ?? idx]} strokeWidth={2} />
              ))}
            </g>
          ) : null}
        </svg>
        {hover != null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${Math.min(78, Math.max(0, (x(hover) / W) * 100 - 10))}%` }}
          >
            <div className="mb-0.5 font-medium text-slate-900">{dayText(days[hover])}</div>
            {series.map((s, idx) => (
              <div className="flex items-center justify-between gap-3 text-slate-700" key={s.name}>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[s.color ?? idx] }} />
                  {s.name}
                </span>
                <span className="font-medium tabular-nums text-slate-900">{fmtFor(s)(s.values[hover])}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {series.length > 1 ? (
        <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {series.map((s, idx) => (
            <span className="inline-flex items-center gap-1.5" key={s.name}>
              <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: SERIES_COLORS[s.color ?? idx] }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Horizontal bars with the name and value as text beside each bar (labels never sit on the colour). */
export function BarList({ rows, format = fmt, empty = 'Nothing yet' }: { rows: Array<{ label: string; value: number; hint?: string }>; format?: (n: number) => string; empty?: string }): JSX.Element {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="m-0 py-6 text-center text-[13px] text-slate-500">{empty}</p>;
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {rows.map((r, i) => (
        <li className="grid gap-1" key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-slate-800" title={r.label}>
              {r.label}
              {r.hint ? <span className="ml-1.5 text-xs text-slate-500">{r.hint}</span> : null}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-slate-900">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-[4px] bg-slate-100">
            <div className="h-full rounded-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One bar split into labelled parts (a share of a whole), with a legend that carries the numbers. */
export function ShareBar({ parts }: { parts: Array<{ label: string; value: number }> }): JSX.Element {
  const total = parts.reduce((n, p) => n + p.value, 0);
  if (!total) return <p className="m-0 py-3 text-center text-[13px] text-slate-500">Nothing yet</p>;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-[4px]" role="img" aria-label={parts.map((p) => `${p.label} ${fmt(p.value)}`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((p, i) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: SERIES_COLORS[i % SERIES_COLORS.length] }} title={`${p.label}: ${fmt(p.value)}`} />
        ))}
      </div>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-slate-700">
        {parts.map((p, i) => (
          <li className="inline-flex items-center gap-1.5" key={p.label}>
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {p.label} <span className="font-medium tabular-nums text-slate-900">{fmt(p.value)}</span>
            <span className="text-slate-500">({Math.round((p.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Panel({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]', className)}>
      <header className="mb-3">
        <h3 className="m-0 text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
        {hint ? <p className="m-0 mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
