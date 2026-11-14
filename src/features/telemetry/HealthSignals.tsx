import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/components/ui';
import { telemetryApi, type HealthSignals as Signals } from '@/services/telemetry';

const pct = (ratio: number): string => `${Math.round(ratio * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

interface Tile {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: 'ok' | 'warn' | 'bad' | 'none';
  to: string;
}

const TONE: Record<Tile['tone'], string> = {
  ok: 'text-slate-500',
  warn: 'text-amber-700',
  bad: 'text-red-700',
  none: 'text-slate-500',
};

function change(current: number, previous: number | null, unit: string): string | null {
  if (previous == null) return null;
  const delta = Math.round(current - previous);
  if (delta === 0) return 'no change';
  return `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)}${unit}`;
}

function tiles(s: Signals): Tile[] {
  const out: Tile[] = [];
  out.push(
    s.sla.health == null
      ? {
          id: 'sla',
          label: 'SLA health',
          value: '—',
          hint: 'No open work with deadlines',
          tone: 'none',
          to: '/dashboard',
        }
      : {
          id: 'sla',
          label: 'SLA health',
          value: pct(s.sla.health),
          hint: s.sla.breached
            ? `${s.sla.breached} of ${plural(s.sla.open, 'open task')} late${s.sla.worstProject ? ` · worst: ${s.sla.worstProject.name}` : ''}`
            : `${plural(s.sla.open, 'open task')} on time`,
          tone: s.sla.health < 0.7 ? 'bad' : s.sla.breached ? 'warn' : 'ok',
          to: s.sla.worstProject ? `/projects/${s.sla.worstProject.id}` : '/dashboard',
        },
  );
  const risky = s.agents.high + s.agents.critical;
  out.push({
    id: 'agents',
    label: 'Agent risk',
    value: risky ? `${risky} at high risk` : 'All clear',
    hint: [
      s.agents.critical ? `${s.agents.critical} critical` : '',
      s.agents.unregistered ? `${s.agents.unregistered} unregistered` : '',
      plural(s.agents.total, 'agent'),
    ]
      .filter(Boolean)
      .join(' · '),
    tone: s.agents.critical ? 'bad' : risky ? 'warn' : 'ok',
    to: '/agents/inventory',
  });
  if (s.engagement && s.engagement.completionRate != null) {
    const e = s.engagement;
    const delta = change(
      (e.completionRate as number) * 100,
      e.previousRate == null ? null : e.previousRate * 100,
      ' pts',
    );
    out.push({
      id: 'engagement',
      label: 'Guide completion',
      value: pct(e.completionRate as number),
      hint: [
        delta ? `${delta} on last week` : `${plural(e.people, 'person', 'people')} this week`,
        e.worstGuide ? `lowest: ${e.worstGuide.title} ${pct(e.worstGuide.rate)}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      tone:
        e.previousRate != null && (e.completionRate as number) < e.previousRate * 0.85
          ? 'bad'
          : 'ok',
      to: e.worstGuide
        ? `/sdk-integrations/${e.worstGuide.integrationId}/guides?analytics=${e.worstGuide.id}`
        : '/sdk-integrations',
    });
  } else {
    out.push({
      id: 'engagement',
      label: 'Guide completion',
      value: '—',
      hint: 'No live guides seen this week',
      tone: 'none',
      to: '/sdk-integrations',
    });
  }
  if (s.compliance) {
    const delta = change(
      s.compliance.score,
      s.compliance.change == null ? null : s.compliance.score - s.compliance.change,
      '',
    );
    out.push({
      id: 'compliance',
      label: 'Compliance score',
      value: String(s.compliance.score),
      hint: [
        s.compliance.failing
          ? `${plural(s.compliance.failing, 'control')} failing`
          : 'All controls pass',
        delta && delta !== 'no change' ? `${delta} this week` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      tone: s.compliance.score < 60 ? 'bad' : s.compliance.failing ? 'warn' : 'ok',
      to: '/agents/compliance',
    });
  }
  if (s.incidents != null) {
    out.push({
      id: 'incidents',
      label: 'Open incidents',
      value: String(s.incidents),
      hint: s.incidents ? 'Need a decision' : 'Nothing open',
      tone: s.incidents ? 'bad' : 'ok',
      to: '/agents/incidents',
    });
  }
  return out;
}

/** Live health and risk at a glance: SLA, agents, engagement, compliance and incidents. Each tile opens the place to act. */
export function HealthSignals({ className }: { className?: string }): JSX.Element | null {
  const [signals, setSignals] = useState<Signals | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      telemetryApi
        .health()
        .then((data) => !cancelled && setSignals(data))
        .catch(() => !cancelled && setSignals((current) => current ?? null));
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (signals === null) return null;
  const list = signals ? tiles(signals) : [];
  return (
    <section aria-labelledby="health-title" className={className} data-testid="health-signals">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-sm font-semibold text-slate-900" id="health-title">
          Health
        </h2>
        {signals?.autoTasks ? (
          <Link
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
            to="/telemetry/automation"
          >
            {signals.autoTasks} task{signals.autoTasks === 1 ? '' : 's'} opened automatically
          </Link>
        ) : (
          <Link className="text-xs text-slate-500 hover:text-slate-700" to="/telemetry">
            Telemetry
          </Link>
        )}
      </div>
      {signals === undefined ? (
        <div className="h-[86px] animate-pulse rounded-[10px] bg-slate-100" />
      ) : (
        <div
          className={cn(
            'grid grid-cols-2 overflow-hidden rounded-[10px] border border-slate-200 bg-white',
            list.length >= 5
              ? 'lg:grid-cols-5'
              : list.length === 4
                ? 'lg:grid-cols-4'
                : 'lg:grid-cols-3',
          )}
        >
          {list.map((tile) => (
            <Link
              className="-mb-px -mr-px min-w-0 border-b border-r border-slate-200 px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-brand-600/20"
              data-testid={`health-${tile.id}`}
              key={tile.id}
              to={tile.to}
            >
              <div className="truncate text-[13px] text-slate-600">{tile.label}</div>
              <div className="mt-1 truncate text-[19px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
                {tile.value}
              </div>
              <div className={cn('mt-1 truncate text-xs', TONE[tile.tone])} title={tile.hint}>
                {tile.hint}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
