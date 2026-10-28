import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CircleDollarSign, Gauge, Wallet } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, CardHeader, cn, inputClass, type BadgeTone } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { agentsApi, KIND_LABELS, type CostReport, type CostRow, type GovernanceSettings } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const usd = (value: number): string =>
  value >= 100 ? `$${value.toFixed(0)}` : value >= 0.01 ? `$${value.toFixed(2)}` : value > 0 ? '<$0.01' : '$0';

const calls = (n: number): string => `${n.toLocaleString()} ${n === 1 ? 'call' : 'calls'}`;

const LEVEL: Record<CostReport['level'], { tone: BadgeTone; label: string; bar: string }> = {
  ok: { tone: 'success', label: 'Within budget', bar: 'bg-emerald-500' },
  warning: { tone: 'warning', label: 'Over 80% used', bar: 'bg-amber-500' },
  exceeded: { tone: 'danger', label: 'Budget used up', bar: 'bg-red-500' },
  unlimited: { tone: 'neutral', label: 'No limit', bar: 'bg-emerald-500' }
};

/** The last six UTC months, newest first: "2026-10", "2026-09", ... */
const recentMonths = (): string[] => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
};

const monthLabel = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Daily spend: one series, so one hue and no legend; hover shows the day's numbers. */
function DailyChart({ report }: { report: CostReport }): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const [year, month] = report.month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const byDate = new Map(report.daily.map((row) => [row.label, row]));
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${report.month}-${String(i + 1).padStart(2, '0')}`;
    return { date, row: byDate.get(date) };
  });
  const max = Math.max(...days.map((d) => d.row?.cost ?? 0), 0.0001);
  const active = hover == null ? null : days[hover];

  return (
    <div className="p-4">
      <div className="relative h-36" onMouseLeave={() => setHover(null)}>
        {/* Recessive guides at half and full scale. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-100" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[11px] tabular-nums text-slate-400">{usd(max)}</span>
        <div className="absolute inset-0 flex items-end gap-[2px]" role="img" aria-label={`Daily AI spend in ${monthLabel(report.month)}`}>
          {days.map((day, index) => {
            const cost = day.row?.cost ?? 0;
            return (
              <button
                aria-label={`${day.date}: ${usd(cost)}, ${calls(day.row?.calls ?? 0)}`}
                className="group flex h-full min-w-0 flex-1 items-end focus:outline-none"
                key={day.date}
                onBlur={() => setHover(null)}
                onFocus={() => setHover(index)}
                onMouseEnter={() => setHover(index)}
                type="button"
              >
                <span
                  className={cn(
                    'block w-full rounded-t-[4px] transition-colors',
                    cost > 0 ? (hover === index ? 'bg-emerald-600' : 'bg-emerald-500') : 'bg-slate-100'
                  )}
                  style={{ height: cost > 0 ? `${Math.max(3, (cost / max) * 100)}%` : '2px' }}
                />
              </button>
            );
          })}
        </div>
        {active ? (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
            data-testid="cost-tooltip"
            // Kept inside the chart at both ends.
            style={{ left: `clamp(4rem, ${((hover! + 0.5) / days.length) * 100}%, calc(100% - 4rem))` }}
          >
            <div className="font-medium text-slate-900">
              {new Date(`${active.date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </div>
            <div className="tabular-nums text-slate-600">
              {usd(active.row?.cost ?? 0)} · {calls(active.row?.calls ?? 0)}
              {active.row?.errors ? ` · ${active.row.errors} failed` : ''}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
        <span>1</span>
        <span>{Math.ceil(daysInMonth / 2)}</span>
        <span>{daysInMonth}</span>
      </div>
    </div>
  );
}

/** A ranked breakdown; the thin bar is the share of this month's spend. */
function Breakdown({ title, rows, total, testId }: { title: string; rows: CostRow[]; total: number; testId: string }): JSX.Element {
  return (
    <Card data-testid={testId}>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <p className="m-0 p-4 text-[13px] text-slate-500">No AI calls this month.</p>
      ) : (
        <table className="w-full text-left text-[13px]">
          <thead className="sr-only">
            <tr>
              <th>Name</th>
              <th>Calls</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 8).map((row) => (
              <tr key={`${row.id ?? row.label}`}>
                <td className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {row.label}
                      {row.kind ? <span className="ml-1.5 text-xs font-normal text-slate-400">{KIND_LABELS[row.kind]}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{calls(row.calls)}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${total > 0 ? Math.max(1, (row.cost / total) * 100) : 0}%` }} />
                  </div>
                </td>
                <td className="w-24 px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{usd(row.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function BudgetSettings({
  settings,
  workspaceId,
  onSaved
}: {
  settings: GovernanceSettings;
  workspaceId: string | null;
  onSaved: (settings: GovernanceSettings) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [amount, setAmount] = useState(String(settings.aiMonthlyBudgetUsd));
  // Shown at once and put back if saving fails.
  const [hardStop, setHardStop] = useState(settings.aiBudgetHardStop);
  const [saving, setSaving] = useState(false);
  const save = async (body: { aiMonthlyBudgetUsd?: number; aiBudgetHardStop?: boolean }, message: string) => {
    setSaving(true);
    try {
      onSaved(await agentsApi.updateSettings(body, workspaceId));
      showToast({ variant: 'success', message });
    } catch (error) {
      if (body.aiBudgetHardStop !== undefined) setHardStop(!body.aiBudgetHardStop);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 1_000_000;
  return (
    <Card>
      <CardHeader
        description="Per calendar month (UTC), for every AI provider together. Admins are alerted at 80% and 100%."
        icon={<Wallet className="h-4 w-4 shrink-0 text-slate-400" />}
        title="Monthly AI budget"
      />
      <form
        className="flex flex-wrap items-end gap-2 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void save({ aiMonthlyBudgetUsd: value }, value ? `Monthly AI budget set to ${usd(value)}` : 'Monthly AI budget removed');
        }}
      >
        <label className="grid gap-1 text-[13px] font-medium text-slate-700" htmlFor="ai-budget">
          Budget in USD (0 for no limit)
          <input
            className={cn(inputClass, 'h-9 w-40 tabular-nums')}
            id="ai-budget"
            inputMode="decimal"
            min={0}
            onChange={(e) => setAmount(e.target.value)}
            step="1"
            type="number"
            value={amount}
          />
        </label>
        <Button disabled={!valid || value === settings.aiMonthlyBudgetUsd} loading={saving} type="submit" variant="primary">
          Save budget
        </Button>
      </form>
      <label className="flex cursor-pointer items-start gap-2.5 border-t border-slate-100 px-4 py-3 text-[13px] text-slate-700">
        <input
          checked={hardStop}
          className="mt-0.5 h-4 w-4 accent-emerald-600"
          disabled={saving}
          onChange={(e) => {
            const next = e.target.checked;
            setHardStop(next);
            void save({ aiBudgetHardStop: next }, next ? 'AI calls stop when the budget is used up' : 'AI calls continue past the budget (alerts only)');
          }}
          type="checkbox"
        />
        <span>
          Stop AI calls when the budget is used up
          <span className="block text-xs text-slate-500">Off: calls continue and admins are alerted.</span>
        </span>
      </label>
    </Card>
  );
}

export function CostsPanel({ workspaceId, canAdmin }: { workspaceId: string | null; canAdmin: boolean }): JSX.Element {
  const { showToast } = useToast();
  const months = recentMonths();
  const [month, setMonth] = useState(months[0]);
  const [report, setReport] = useState<CostReport | null>(null);
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!canAdmin) return;
    const id = ++requestId.current;
    setReport(null);
    Promise.all([agentsApi.costs(workspaceId, month), agentsApi.settings(workspaceId)])
      .then(([nextReport, nextSettings]) => {
        if (id !== requestId.current) return;
        setReport(nextReport);
        setSettings(nextSettings);
      })
      .catch((error) => {
        if (id === requestId.current) showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      });
  }, [workspaceId, canAdmin, month, showToast]);

  if (!canAdmin) {
    return <EmptyState description="Workspace owners and admins can see AI spend and set the budget." icon={CircleDollarSign} title="Admins only" />;
  }
  if (!report || !settings) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;

  const level = LEVEL[report.level];
  const isCurrent = month === months[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Month">
          {months.map((m) => (
            <button
              aria-pressed={m === month}
              className={cn(
                'h-8 rounded-lg border px-2.5 text-[13px] font-medium transition-colors',
                m === month ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
              key={m}
              onClick={() => setMonth(m)}
              type="button"
            >
              {new Date(`${m}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <Card data-testid="cost-summary">
          <CardHeader
            description={isCurrent ? 'So far this month' : monthLabel(month)}
            icon={<Gauge className="h-4 w-4 shrink-0 text-slate-400" />}
            title="AI spend"
          />
          <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900" data-testid="cost-total">
                {usd(report.total.cost)}
              </div>
              <div className="text-xs text-slate-500">
                {calls(report.total.calls)} · {report.total.tokens.toLocaleString()} tokens
                {report.total.errors ? ` · ${report.total.errors} failed` : ''}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <Badge dot tone={level.tone}>
                  {level.label}
                </Badge>
                <span className="tabular-nums">
                  {report.budgetUsd > 0 ? `${Math.round(report.percent ?? 0)}% of ${usd(report.budgetUsd)}` : 'No monthly limit'}
                </span>
              </div>
              <div
                aria-label="Budget used"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.min(100, Math.round(report.percent ?? 0))}
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
              >
                <div className={cn('h-full rounded-full', level.bar)} style={{ width: `${Math.min(100, report.percent ?? 0)}%` }} />
              </div>
              {report.level === 'exceeded' && isCurrent ? (
                <p className="m-0 mt-2 flex items-start gap-1.5 text-xs text-red-700">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {report.hardStop ? 'AI calls are refused until next month or until the budget is raised.' : 'Calls continue because the hard stop is off.'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="border-t border-slate-100">
            <DailyChart report={report} />
          </div>
        </Card>
        <BudgetSettings
          onSaved={(next) => {
            setSettings(next);
            void agentsApi.costs(workspaceId, month).then(setReport).catch(() => undefined);
          }}
          settings={settings}
          workspaceId={workspaceId}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown rows={report.byAgent} testId="cost-by-agent" title="By agent" total={report.total.cost} />
        <Breakdown rows={report.byUser} testId="cost-by-person" title="By person" total={report.total.cost} />
        <Breakdown rows={report.byProject} testId="cost-by-project" title="By project" total={report.total.cost} />
        <Breakdown rows={report.byProvider} testId="cost-by-provider" title="By provider" total={report.total.cost} />
      </div>
    </div>
  );
}
