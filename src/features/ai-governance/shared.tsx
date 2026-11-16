import { AlertTriangle, Ban, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge, cn, type BadgeTone } from '@/components/ui';
import {
  EU_LABELS,
  STAGE_LABELS,
  TIER_LABELS,
  type EuCategory,
  type EvalStatus,
  type Severity,
  type Stage,
  type Tier,
} from '@/services/aiGovernance';
import { toDisplayErrorMessage } from '@/utils/apiError';

const TIER_TONE: Record<Tier, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'orange',
  prohibited: 'danger',
};

export function TierBadge({ tier }: { tier: Tier | null }): JSX.Element {
  if (!tier) return <Badge tone="neutral">Not assessed</Badge>;
  return (
    <Badge tone={TIER_TONE[tier]}>
      {tier === 'prohibited' ? <Ban aria-hidden className="h-3 w-3" /> : null}
      {TIER_LABELS[tier]}
    </Badge>
  );
}

export function EuBadge({ category }: { category: EuCategory | null }): JSX.Element | null {
  if (!category) return null;
  const tone: BadgeTone =
    category === 'prohibited'
      ? 'danger'
      : category === 'high'
        ? 'orange'
        : category === 'limited'
          ? 'warning'
          : 'neutral';
  return <Badge tone={tone}>EU AI Act: {EU_LABELS[category]}</Badge>;
}

export function StageBadge({
  stage,
  status,
}: {
  stage: Stage;
  status?: 'active' | 'on_hold' | 'rejected';
}): JSX.Element {
  if (status === 'rejected') return <Badge tone="danger">Rejected</Badge>;
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={stage === 'production' ? 'brand' : stage === 'retired' ? 'dark' : 'info'}>
        {STAGE_LABELS[stage]}
      </Badge>
      {status === 'on_hold' ? <Badge tone="warning">On hold</Badge> : null}
    </span>
  );
}

export function EvalBadge({ status }: { status: EvalStatus | null }): JSX.Element {
  if (status === 'pass')
    return (
      <Badge tone="success">
        <CheckCircle2 aria-hidden className="h-3 w-3" /> Passing
      </Badge>
    );
  if (status === 'fail')
    return (
      <Badge tone="danger">
        <XCircle aria-hidden className="h-3 w-3" /> Failing
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <CircleDashed aria-hidden className="h-3 w-3" />{' '}
      {status ? 'Not enough data' : 'Not evaluated'}
    </Badge>
  );
}

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'orange',
  critical: 'danger',
};
export function SeverityBadge({ severity }: { severity: Severity }): JSX.Element {
  return (
    <Badge tone={SEVERITY_TONE[severity]}>
      {severity === 'critical' || severity === 'high' ? (
        <AlertTriangle aria-hidden className="h-3 w-3" />
      ) : null}
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

/** The governance score as a number with a bar; the number carries the meaning, the colour only supports it. */
export function Score({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }): JSX.Element {
  const tone = value >= 80 ? 'bg-green-600' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span
      aria-label={`Governance score ${value} of 100`}
      className={cn('inline-flex items-center gap-2', size === 'lg' && 'gap-3')}
      role="img"
    >
      <span
        className={cn(
          'font-mono font-semibold tabular-nums text-slate-900',
          size === 'lg' ? 'text-3xl' : 'text-[13px]',
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'overflow-hidden rounded-full bg-slate-100',
          size === 'lg' ? 'h-2 w-32' : 'h-1.5 w-14',
        )}
      >
        <span className={cn('block h-full rounded-full', tone)} style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}

export function ErrorNote({ message }: { message: string | null }): JSX.Element | null {
  if (!message) return null;
  return (
    <p
      className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
      data-testid="aigov-error"
      role="alert"
    >
      {message}
    </p>
  );
}

/** Runs an async action with a busy flag and an error message that stays on screen. */
export function useAction(): {
  busy: boolean;
  error: string | null;
  clear: () => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    busy,
    error,
    clear: () => setError(null),
    run: async (fn) => {
      setBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (e) {
        setError(toDisplayErrorMessage(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
  };
}

export const day = (value: string | null | undefined): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';
