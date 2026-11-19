import { useState } from 'react';

import { cn } from '@/components/ui';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Big text in the middle (the total). */
  centerValue: string;
  /** Small text under it. */
  centerLabel: string;
  /** Formats a segment's value for the tooltip text. */
  formatValue: (value: number) => string;
  size?: number;
}

/**
 * A ring with the total in the middle and one arc per item, sized by its share. Hovering an arc or a legend row
 * highlights it. Drawn with SVG circles so it needs no chart library.
 */
export function DonutChart({ segments, centerValue, centerLabel, formatValue, size = 190 }: DonutChartProps): JSX.Element {
  const [active, setActive] = useState<string | null>(null);
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((n, s) => n + s.value, 0);
  // A thin gap between arcs, except when there is only one.
  const gap = segments.length > 1 ? 2.5 : 0;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4" data-testid="work-donut">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg aria-label={`Time by project: ${segments.map((s) => `${s.label} ${formatValue(s.value)}`).join(', ')}`} height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
          <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#eef1f4" strokeWidth={stroke} />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segments.map((s) => {
              const length = total ? (s.value / total) * circumference : 0;
              const dash = Math.max(0, length - gap);
              const node = (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  data-testid="work-donut-arc"
                  fill="none"
                  key={s.id}
                  onMouseEnter={() => setActive(s.id)}
                  onMouseLeave={() => setActive(null)}
                  opacity={active && active !== s.id ? 0.35 : 1}
                  r={radius}
                  stroke={s.color}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeWidth={active === s.id ? stroke + 4 : stroke}
                  style={{ transition: 'opacity 120ms, stroke-width 120ms' }}
                >
                  <title>{`${s.label}: ${formatValue(s.value)} (${total ? Math.round((s.value / total) * 100) : 0}%)`}</title>
                </circle>
              );
              offset += length;
              return node;
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <div className="text-2xl font-semibold tabular-nums leading-tight text-slate-900" data-testid="work-donut-total">
            {centerValue}
          </div>
          <div className="text-xs text-slate-500">{centerLabel}</div>
        </div>
      </div>
      <ul className="m-0 grid min-w-[200px] flex-1 list-none gap-1.5 p-0" data-testid="work-donut-legend">
        {segments.map((s) => (
          <li
            className={cn('flex items-center gap-2.5 rounded-md px-2 py-1 text-[13px] transition-colors', active === s.id && 'bg-slate-100')}
            key={s.id}
            onMouseEnter={() => setActive(s.id)}
            onMouseLeave={() => setActive(null)}
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-800" title={s.label}>
              {s.label}
            </span>
            <span className="shrink-0 tabular-nums text-slate-900">{formatValue(s.value)}</span>
            <span className="w-9 shrink-0 text-right tabular-nums text-xs text-slate-500">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
