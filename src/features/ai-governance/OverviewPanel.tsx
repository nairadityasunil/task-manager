import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ClipboardCheck,
  FileSearch,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Button, Card, CardHeader, cn } from '@/components/ui';
import { STAGE_LABELS, STAGE_ORDER, aiGovApi, type Overview } from '@/services/aiGovernance';

import { EvalBadge, Score, StageBadge, TierBadge } from './shared';

const LEVEL = (score: number): { cls: string; label: string } =>
  score >= 20
    ? { cls: 'bg-red-600 text-white', label: 'critical' }
    : score >= 12
      ? { cls: 'bg-orange-400 text-slate-900', label: 'high' }
      : score >= 6
        ? { cls: 'bg-amber-200 text-slate-900', label: 'medium' }
        : { cls: 'bg-green-100 text-slate-900', label: 'low' };

function Heatmap({ counts }: { counts: Record<string, number> }): JSX.Element {
  return (
    <div data-testid="risk-heatmap">
      <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-[11px]">
        {[5, 4, 3, 2, 1].map((likelihood) => (
          <div className="contents" key={likelihood}>
            <span className="flex items-center pr-1 text-slate-500">{likelihood}</span>
            {[1, 2, 3, 4, 5].map((impact) => {
              const n = counts[`${likelihood}:${impact}`] ?? 0;
              const level = LEVEL(likelihood * impact);
              return (
                <span
                  aria-label={`Likelihood ${likelihood}, impact ${impact}, ${level.label}: ${n} risk${n === 1 ? '' : 's'}`}
                  className={cn(
                    'flex h-8 items-center justify-center rounded font-mono text-xs font-semibold',
                    level.cls,
                    n === 0 && 'opacity-40',
                  )}
                  key={impact}
                  role="img"
                >
                  {n || ''}
                </span>
              );
            })}
          </div>
        ))}
        <span />
        {[1, 2, 3, 4, 5].map((i) => (
          <span className="text-center text-slate-500" key={i}>
            {i}
          </span>
        ))}
      </div>
      <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>Likelihood (rows) by impact (columns), after controls.</span>
        {[1, 6, 12, 20].map((s) => (
          <span className="inline-flex items-center gap-1" key={s}>
            <span className={cn('h-2.5 w-2.5 rounded-sm', LEVEL(s).cls)} /> {LEVEL(s).label}
          </span>
        ))}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  danger,
  onClick,
}: {
  label: string;
  value: string | number;
  hint: string;
  danger?: boolean;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      className="flex h-full min-w-0 flex-col items-start border-0 bg-transparent px-4 py-3.5 text-left hover:bg-slate-50 disabled:cursor-default"
      disabled={!onClick}
      onClick={onClick}
      type="button"
    >
      <span className="block text-[13px] text-slate-600">{label}</span>
      <span className="mt-1 block font-mono text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </span>
      <span className={cn('mt-0.5 block text-xs', danger ? 'text-red-700' : 'text-slate-500')}>
        {hint}
      </span>
    </button>
  );
}

/** The portfolio at a glance: what exists, how risky it is, how well it is governed and what needs attention. */
export function OverviewPanel({
  onOpen,
  onGo,
  onNew,
}: {
  onOpen: (id: string) => void;
  onGo: (tab: 'use-cases' | 'issues' | 'discovery') => void;
  onNew: () => void;
}): JSX.Element {
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    aiGovApi
      .overview()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  if (failed)
    return (
      <EmptyState
        description="The AI governance overview could not be loaded. Try again in a moment."
        icon={AlertTriangle}
        title="Could not load"
      />
    );
  if (!data) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  if (data.total === 0 && data.prohibited === 0)
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <EmptyState
          action={
            <Button onClick={onNew} variant="primary">
              Register the first use case
            </Button>
          }
          description="Register each way your organisation uses AI. Pristine then assesses its risk, tracks approvals, evaluates it in production and keeps the evidence."
          icon={ClipboardCheck}
          title="No AI use cases yet"
        />
        {data.ungoverned.agents + data.ungoverned.prompts > 0 ? (
          <Card className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Bot aria-hidden className="h-4 w-4 text-amber-600" />
            <p className="m-0 min-w-0 flex-1 text-[13px] text-slate-700">
              {data.ungoverned.agents} agent(s) and {data.ungoverned.prompts} prompt(s) are in use
              without a registered use case.
            </p>
            <Button onClick={() => onGo('discovery')} size="sm">
              Review them
            </Button>
          </Card>
        ) : null}
      </div>
    );
  const maxStage = Math.max(1, ...STAGE_ORDER.map((s) => data.byStage[s] ?? 0));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4" data-testid="aigov-overview">
      <Card className="grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        <Stat
          hint={`${data.byStage.production} in production`}
          label="AI use cases"
          onClick={() => onGo('use-cases')}
          value={data.total}
        />
        <Stat
          hint={
            data.productionScore == null
              ? 'Nothing in production'
              : `${data.productionScore} in production`
          }
          label="Governance score"
          value={data.averageScore ?? '—'}
        />
        <Stat
          danger={data.byTier.high > 0}
          hint={`${data.byEuCategory.high} high-risk under the EU AI Act`}
          label="High risk"
          onClick={() => onGo('use-cases')}
          value={data.byTier.high}
        />
        <Stat
          danger={data.failingEvaluations > 0}
          hint={`${data.notEvaluated} in production not evaluated this week`}
          label="Failing evaluations"
          value={data.failingEvaluations}
        />
        <Stat
          danger={data.openIssues.critical + data.openIssues.high > 0}
          hint={`${data.openIssues.critical + data.openIssues.high} high or critical · ${data.openIssues.overdue} overdue`}
          label="Open issues"
          onClick={() => onGo('issues')}
          value={data.openIssues.total}
        />
        <Stat
          danger={data.overdueReviews > 0}
          hint={`${data.ungoverned.agents + data.ungoverned.prompts} assets with no use case`}
          label="Overdue reviews"
          onClick={() => onGo('discovery')}
          value={data.overdueReviews}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            description="Where each use case is in its lifecycle."
            icon={<FileSearch aria-hidden className="h-4 w-4 text-slate-400" />}
            title="Lifecycle"
          />
          <ul className="m-0 grid list-none gap-2 p-4" data-testid="stage-bars">
            {STAGE_ORDER.map((s) => (
              <li
                className="grid grid-cols-[130px_1fr_28px] items-center gap-2 text-[13px]"
                key={s}
              >
                <span className="text-slate-700">{STAGE_LABELS[s]}</span>
                <span className="h-3 overflow-hidden rounded bg-slate-100">
                  <span
                    className="block h-full rounded bg-[#2a78d6]"
                    style={{ width: `${((data.byStage[s] ?? 0) / maxStage) * 100}%` }}
                  />
                </span>
                <span className="text-right font-mono tabular-nums text-slate-900">
                  {data.byStage[s] ?? 0}
                </span>
              </li>
            ))}
          </ul>
          <p className="m-0 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            Risk tiers: {data.byTier.high} high · {data.byTier.medium} medium · {data.byTier.low}{' '}
            low · {data.byTier.unassessed} not assessed
            {data.prohibited ? ` · ${data.prohibited} prohibited (rejected)` : ''}
          </p>
        </Card>
        <Card>
          <CardHeader
            description={`${data.risks.total} risks across all use cases, ${data.risks.untreated} not yet treated.`}
            icon={<ShieldAlert aria-hidden className="h-4 w-4 text-slate-400" />}
            title="Risk heatmap"
          />
          <div className="p-4">
            <Heatmap counts={data.risks.heatmap} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          description="Failing evaluations, overdue reviews and low scores in production."
          title="Needs attention"
        />
        {data.attention.length ? (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {data.attention.map((u) => (
              <li key={u.id}>
                <button
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-0 bg-transparent px-4 py-2.5 text-left hover:bg-slate-50"
                  onClick={() => onOpen(u.id)}
                  type="button"
                >
                  <span className="font-mono text-xs text-slate-500">{u.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">
                    {u.name}
                  </span>
                  <span className="text-xs font-medium text-red-700">{u.reason}</span>
                  <StageBadge stage={u.stage} status={u.status} />
                  <TierBadge tier={u.tier} />
                  <EvalBadge status={u.evaluationStatus} />
                  <Score value={u.score} />
                  <ArrowRight aria-hidden className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-slate-500">
            Nothing needs attention.
          </p>
        )}
      </Card>
    </div>
  );
}
