import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  RefreshCw,
  Settings2,
  TrendingDown,
  TrendingUp,
  Workflow,
} from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, CardHeader, Select, Switch, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { timeAgo } from '@/services/agents';
import {
  RULE_LABELS,
  formatMetric,
  taskLink,
  telemetryApi,
  type AutomationOverview,
  type AutomationRule,
  type AutomationSettings,
  type AutomationTask,
} from '@/services/telemetry';
import type { Project } from '@/types/project';
import { isHeldForApproval, toDisplayErrorMessage } from '@/utils/apiError';

const OUTCOME = {
  improved: { label: 'Improved', tone: 'success' as const, icon: TrendingUp },
  worse: { label: 'Got worse', tone: 'danger' as const, icon: TrendingDown },
  unchanged: { label: 'No real change', tone: 'neutral' as const, icon: ArrowRight },
};

/** "Drop-off at step 2: 58% → 20%" once measured again, else the starting value. */
export function MetricLine({
  task,
}: {
  task: Pick<AutomationTask, 'metric' | 'result' | 'remeasureAt'>;
}): JSX.Element | null {
  if (!task.metric) return null;
  const before = formatMetric(task.metric.unit, task.metric.value);
  if (task.result) {
    const o = OUTCOME[task.result.outcome];
    return (
      <span
        className="inline-flex flex-wrap items-center gap-1.5 text-xs text-slate-600"
        data-testid="metric-result"
      >
        {task.metric.name}: <span className="font-mono">{before}</span>
        <ArrowRight aria-hidden className="h-3 w-3 text-slate-400" />
        <span className="font-mono font-medium text-slate-900">
          {formatMetric(task.metric.unit, task.result.value)}
        </span>
        <Badge tone={o.tone}>{o.label}</Badge>
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-600">
      {task.metric.name}: <span className="font-mono">{before}</span>
      {task.remeasureAt
        ? ` · measured again on ${new Date(task.remeasureAt).toLocaleDateString()}`
        : ''}
    </span>
  );
}

function TaskRow({ task }: { task: AutomationTask }): JSX.Element {
  return (
    <li
      className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3"
      data-testid="automation-task"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {task.taskExists ? (
            <Link
              className="text-[13px] font-medium text-slate-900 hover:text-brand-700"
              to={taskLink(task.taskId, task.projectId)}
            >
              {task.title}
            </Link>
          ) : (
            <span className="text-[13px] font-medium text-slate-500 line-through">
              {task.title}
            </span>
          )}
          <Badge tone="neutral">{RULE_LABELS[task.rule] ?? task.rule}</Badge>
          {task.state === 'open' ? (
            <Badge dot tone={task.escalated ? 'danger' : 'warning'}>
              {task.escalated ? 'Escalated' : 'Open'}
            </Badge>
          ) : (
            <Badge tone="success">
              {task.closedBy === 'system'
                ? 'Closed automatically'
                : task.taskExists
                  ? 'Done'
                  : 'Removed'}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>Opened {timeAgo(task.createdAt)}</span>
          <MetricLine task={task} />
        </div>
      </div>
      <Link
        className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
        to={task.sourceLink}
      >
        Open the source
      </Link>
    </li>
  );
}

function SettingsCard({
  data,
  projects,
  onSaved,
}: {
  data: AutomationOverview;
  projects: Project[];
  onSaved: (settings: AutomationSettings) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const s = data.settings;
  const disabled = saving || !data.canAdmin;

  const save = async (patch: Parameters<typeof telemetryApi.updateAutomation>[0]) => {
    setSaving(true);
    try {
      onSaved((await telemetryApi.updateAutomation(patch)).settings);
      showToast({ variant: 'success', message: 'Saved' });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const row = (title: string, detail: string, control: JSX.Element, key?: string) => (
    <div
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
      key={key ?? title}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
      {control}
    </div>
  );

  return (
    <Card data-testid="automation-settings">
      <CardHeader
        description={
          data.canAdmin
            ? 'What opens a task by itself, and where those tasks go.'
            : 'Workspace owners and admins change these.'
        }
        icon={<Settings2 className="h-4 w-4 text-slate-400" />}
        title="Automation rules"
      />
      <div className="divide-y divide-slate-100">
        {row(
          'Open tasks automatically',
          'Turn everything off here without losing the rule choices below.',
          <Switch
            aria-label="Open tasks automatically"
            checked={s.enabled}
            disabled={disabled}
            onChange={() => void save({ enabled: !s.enabled })}
          />,
        )}
        {row(
          'Send general tasks to',
          'Tasks that are not about one project. Without a project they go to the assignee’s own list.',
          <Select
            aria-label="Project for automatic tasks"
            className="w-56"
            disabled={disabled}
            onValueChange={(value) => void save({ projectId: value || null })}
            options={[
              { value: '', label: 'The assignee’s own list' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={s.projectId ?? ''}
          />,
        )}
        {(['telemetry', 'governance'] as const).map((group) => (
          <div key={group}>
            <div className="bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-500">
              {group === 'telemetry' ? 'From product telemetry' : 'From governance'}
            </div>
            <div className="divide-y divide-slate-100">
              {data.rules
                .filter((r) => r.group === group)
                .map((rule) =>
                  row(
                    rule.label,
                    rule.detail,
                    <Switch
                      aria-label={rule.label}
                      checked={s.rules[rule.id]}
                      disabled={disabled || !s.enabled}
                      onChange={() =>
                        void save({
                          rules: { [rule.id]: !s.rules[rule.id] } as Partial<
                            Record<AutomationRule, boolean>
                          >,
                        })
                      }
                    />,
                    rule.id,
                  ),
                )}
            </div>
          </div>
        ))}
        <div className="bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-500">
          Thresholds and data
        </div>
        {row(
          'Guide drop-off threshold',
          'A step that loses more than this share of the people who reach it opens a task.',
          <Select
            aria-label="Guide drop-off threshold"
            className="w-28"
            disabled={disabled}
            onValueChange={(value) => void save({ dropOffThreshold: Number(value) })}
            options={[0.2, 0.3, 0.4, 0.5, 0.6].map((v) => ({
              value: String(v),
              label: `${v * 100}%`,
            }))}
            value={String(s.dropOffThreshold)}
          />,
        )}
        {row(
          'Survey score threshold',
          'Average below this (on a 1–5 scale) opens a task.',
          <Select
            aria-label="Survey score threshold"
            className="w-28"
            disabled={disabled}
            onValueChange={(value) => void save({ surveyScoreThreshold: Number(value) })}
            options={[2.5, 3, 3.5, 4].map((v) => ({ value: String(v), label: v.toFixed(1) }))}
            value={String(s.surveyScoreThreshold)}
          />,
        )}
        {row(
          'Fewest people before judging',
          'Rules wait for at least this many people or answers.',
          <Select
            aria-label="Fewest people before judging"
            className="w-28"
            disabled={disabled}
            onValueChange={(value) => void save({ minSample: Number(value) })}
            options={[10, 20, 50, 100].map((v) => ({ value: String(v), label: String(v) }))}
            value={String(s.minSample)}
          />,
        )}
        {row(
          'Measure again after',
          'When a telemetry task is done, its metric is measured again to show whether the fix worked.',
          <Select
            aria-label="Measure again after"
            className="w-28"
            disabled={disabled}
            onValueChange={(value) => void save({ remeasureDays: Number(value) })}
            options={[7, 14, 30].map((v) => ({ value: String(v), label: `${v} days` }))}
            value={String(s.remeasureDays)}
          />,
        )}
        {row(
          'Keep end-user events for',
          'Older events from your SDK integrations are deleted. Agent activity is always kept for 90 days.',
          <Select
            aria-label="Keep end-user events for"
            className="w-36"
            disabled={disabled}
            onValueChange={(value) => void save({ eventRetentionDays: Number(value) })}
            options={data.retentionOptions.map((v) => ({
              value: String(v),
              label: v ? `${v} days` : 'Indefinitely',
            }))}
            value={String(s.eventRetentionDays)}
          />,
        )}
      </div>
    </Card>
  );
}

/** Tasks the system opened from telemetry and governance events, what came of them, and the rules. */
export function AutomationPanel({
  projects,
  compact = false,
}: {
  projects: Project[];
  compact?: boolean;
}): JSX.Element {
  const { showToast } = useToast();
  const [data, setData] = useState<AutomationOverview | null>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<'open' | 'results' | 'all'>('open');

  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(() => {
    telemetryApi
      .automation()
      .then((next) => {
        setData(next);
        setLoadError(null);
      })
      // Never show "0 tasks" when the list simply could not be read.
      .catch((error) =>
        setLoadError(toDisplayErrorMessage(error) || 'The task list could not be loaded.'),
      );
  }, []);
  useEffect(load, [load]);

  const run = async () => {
    setRunning(true);
    try {
      const r = await telemetryApi.run();
      setData((current) => (current ? { ...current, tasks: r.tasks } : current));
      setLoadError(null);
      showToast({
        variant: 'success',
        message:
          r.opened || r.closed || r.measured
            ? `${r.opened} opened, ${r.closed} closed, ${r.measured} measured again`
            : 'Checked: nothing new',
      });
    } catch (error) {
      // The API client already says why (e.g. an automated session's request was sent for approval); keep what is on screen.
      if (!isHeldForApproval(error)) setLoadError(toDisplayErrorMessage(error));
    } finally {
      setRunning(false);
    }
  };

  const tasks = data?.tasks ?? [];
  const open = tasks.filter((t) => t.state === 'open');
  const results = tasks.filter((t) => t.result);
  const shown = (filter === 'open' ? open : filter === 'results' ? results : tasks).slice(
    0,
    compact ? 6 : 100,
  );

  return (
    <div className="space-y-4">
      <Card data-testid="automation-tasks">
        <CardHeader
          actions={
            <Button
              icon={RefreshCw}
              loading={running}
              onClick={() => void run()}
              size="sm"
              title="Check every rule now instead of waiting for the next scheduled run"
            >
              Check now
            </Button>
          }
          description="Opened by Pristine when a metric crosses a threshold or something needs a person. They close by themselves when the cause goes away."
          icon={<Workflow className="h-4 w-4 text-slate-400" />}
          title="Tasks opened automatically"
        />
        <div className={cn('flex gap-1.5 border-b border-slate-100 px-4 py-2', data == null && 'hidden')}>
          {(
            [
              ['open', `Open · ${open.length}`],
              ['results', `Results · ${results.length}`],
              ['all', `All · ${tasks.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              aria-pressed={filter === id}
              className={cn(
                'h-7 rounded-md px-2.5 text-xs font-medium',
                filter === id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
              key={id}
              onClick={() => setFilter(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {loadError ? (
          <div
            className="flex flex-wrap items-center gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-800"
            data-testid="automation-error"
            role="alert"
          >
            <span className="min-w-0 flex-1">Could not load the tasks: {loadError}</span>
            <Button onClick={load} size="sm">
              Try again
            </Button>
          </div>
        ) : null}
        {loadError && data == null ? null : data == null ? (
          <div className="space-y-2 p-4">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : shown.length === 0 ? (
          <div className="p-4">
            <EmptyState
              compact
              description={
                filter === 'results'
                  ? `When a telemetry task is done, its metric is measured again after ${data.settings.remeasureDays} days and the result shows here.`
                  : data.settings.enabled
                    ? 'Nothing needs attention right now.'
                    : 'Automatic tasks are switched off.'
              }
              icon={filter === 'results' ? CheckCircle2 : Bot}
              title={filter === 'results' ? 'No results yet' : 'No automatic tasks'}
            />
          </div>
        ) : (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {shown.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
        {compact && tasks.length > shown.length ? (
          <Link
            className="block border-t border-slate-100 px-4 py-2.5 text-[13px] text-brand-600 hover:text-brand-700"
            to="/telemetry/automation"
          >
            See all {tasks.length}
          </Link>
        ) : null}
      </Card>
      {!compact && data ? (
        <SettingsCard
          data={data}
          onSaved={(settings) => setData({ ...data, settings })}
          projects={projects}
        />
      ) : null}
    </div>
  );
}
