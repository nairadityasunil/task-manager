import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  CheckCircle2,
  CircleDashed,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { Badge, Button, Card, CardHeader, Field, Input, Select, Switch, cn } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { timeAgo } from '@/services/agents';
import {
  CONDITION_LABELS,
  FILTER_OP_LABELS,
  MATH_LABELS,
  insightsApi,
  type AlertCondition,
  type Cohort,
  type CohortDefinition,
  type EventSchema,
  type MathOp,
  type MetricAlert,
  type SeriesSpec,
  type Source,
  type Sources,
} from '@/services/insights';
import { taskLink } from '@/services/telemetry';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { fmt } from './charts';

/* ------------------------------------------------------------------ */
/* Cohorts                                                              */
/* ------------------------------------------------------------------ */

function CohortEditor({
  sources,
  cohort,
  onClose,
  onSaved,
}: {
  sources: Sources;
  cohort: Cohort | null;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [integrationId, setIntegrationId] = useState(
    cohort?.integrationId ?? sources.integrations[0]?.id ?? '',
  );
  const [name, setName] = useState(cohort?.name ?? '');
  const [def, setDef] = useState<CohortDefinition>(
    cohort?.definition ?? {
      match: 'all',
      rules: [{ kind: 'did', event: '', count: 1, withinDays: 30 }],
      properties: [],
    },
  );
  const [schema, setSchema] = useState<EventSchema | null>(null);
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!integrationId) return;
    insightsApi
      .schema(integrationId)
      .then((s) => {
        setSchema(s);
        setDef((d) => ({
          ...d,
          rules: d.rules.map((r) => (r.event ? r : { ...r, event: s.events[0]?.name ?? '' })),
        }));
      })
      .catch(() => setSchema(null));
  }, [integrationId]);

  const valid =
    def.rules.every((r) => r.event) &&
    (def.rules.length > 0 || (def.properties ?? []).some((p) => p.property));
  useEffect(() => {
    if (!integrationId || !valid) return setPreview(null);
    const timer = window.setTimeout(() => {
      insightsApi
        .previewCohort(integrationId, def)
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [integrationId, JSON.stringify(def), valid]);

  const events = (schema?.events ?? []).map((e) => ({ value: e.name, label: e.name }));
  const props = (schema?.properties ?? []).map((p) => ({ value: p.name, label: p.name }));
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (cohort) await insightsApi.updateCohort(cohort.id, { name: name.trim(), definition: def });
      else await insightsApi.createCohort({ integrationId, name: name.trim(), definition: def });
      onSaved();
    } catch (e) {
      setError(toDisplayErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      footer={
        <>
          <span className="mr-auto text-[13px] text-slate-600" data-testid="cohort-preview">
            {preview
              ? `${fmt(preview.count)} ${preview.count === 1 ? 'person matches' : 'people match'} now`
              : valid
                ? 'Counting…'
                : 'Add a condition'}
          </span>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !valid}
            loading={busy}
            onClick={() => void save()}
            variant="primary"
          >
            {cohort ? 'Save changes' : 'Create cohort'}
          </Button>
        </>
      }
      maxWidth="max-w-[640px]"
      onClose={onClose}
      title={cohort ? `Edit ${cohort.name}` : 'New cohort'}
    >
      <div className="grid gap-4">
        {error ? (
          <p
            className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input
              autoFocus
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Active buyers"
              value={name}
            />
          </Field>
          <Field label="App">
            <Select
              disabled={Boolean(cohort)}
              onValueChange={setIntegrationId}
              options={sources.integrations.map((i) => ({ value: i.id, label: i.name }))}
              value={integrationId}
            />
          </Field>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-[13px] text-slate-700">
            People who match
            <Select
              aria-label="Match"
              className="w-24"
              onValueChange={(v) => setDef({ ...def, match: v as 'all' | 'any' })}
              options={[
                { value: 'all', label: 'all' },
                { value: 'any', label: 'any' },
              ]}
              value={def.match}
            />
            of these:
          </div>
          {def.rules.map((r, i) => (
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
              data-testid="cohort-rule"
              key={i}
            >
              <Select
                aria-label="Did or did not"
                className="w-28"
                onValueChange={(v) =>
                  setDef({
                    ...def,
                    rules: def.rules.map((x, j) =>
                      j === i ? { ...x, kind: v as 'did' | 'did_not' } : x,
                    ),
                  })
                }
                options={[
                  { value: 'did', label: 'Did' },
                  { value: 'did_not', label: 'Did not do' },
                ]}
                value={r.kind}
              />
              <Select
                aria-label="Event"
                className="w-44"
                onValueChange={(v) =>
                  setDef({
                    ...def,
                    rules: def.rules.map((x, j) => (j === i ? { ...x, event: v } : x)),
                  })
                }
                options={events}
                placeholder="Event"
                value={r.event}
              />
              {r.kind === 'did' ? (
                <>
                  <span className="text-xs text-slate-500">at least</span>
                  <Input
                    aria-label="Times"
                    className="w-16"
                    min={1}
                    onChange={(e) =>
                      setDef({
                        ...def,
                        rules: def.rules.map((x, j) =>
                          j === i ? { ...x, count: Number(e.target.value) || 1 } : x,
                        ),
                      })
                    }
                    type="number"
                    value={r.count ?? 1}
                  />
                  <span className="text-xs text-slate-500">times</span>
                </>
              ) : null}
              <span className="text-xs text-slate-500">in the last</span>
              <Select
                aria-label="Days"
                className="w-28"
                onValueChange={(v) =>
                  setDef({
                    ...def,
                    rules: def.rules.map((x, j) => (j === i ? { ...x, withinDays: Number(v) } : x)),
                  })
                }
                options={[1, 7, 14, 30, 90].map((d) => ({
                  value: String(d),
                  label: `${d} day${d === 1 ? '' : 's'}`,
                }))}
                value={String(r.withinDays)}
              />
              <Button
                aria-label="Remove condition"
                icon={X}
                onClick={() => setDef({ ...def, rules: def.rules.filter((_, j) => j !== i) })}
                size="icon-sm"
                variant="ghost"
              />
            </div>
          ))}
          {(def.properties ?? []).map((p, i) => (
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
              key={`p${i}`}
            >
              <span className="text-xs text-slate-500">Property</span>
              <Select
                aria-label="Property"
                className="w-36"
                onValueChange={(v) =>
                  setDef({
                    ...def,
                    properties: (def.properties ?? []).map((x, j) =>
                      j === i ? { ...x, property: v } : x,
                    ),
                  })
                }
                options={props}
                value={p.property}
              />
              <span className="text-xs text-slate-500">is</span>
              <Input
                aria-label="Property value"
                className="w-36"
                onChange={(e) =>
                  setDef({
                    ...def,
                    properties: (def.properties ?? []).map((x, j) =>
                      j === i ? { ...x, value: e.target.value } : x,
                    ),
                  })
                }
                value={String(p.value ?? '')}
              />
              <Button
                aria-label="Remove property condition"
                icon={X}
                onClick={() =>
                  setDef({ ...def, properties: (def.properties ?? []).filter((_, j) => j !== i) })
                }
                size="icon-sm"
                variant="ghost"
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              icon={Plus}
              onClick={() =>
                setDef({
                  ...def,
                  rules: [
                    ...def.rules,
                    { kind: 'did', event: events[0]?.value ?? '', count: 1, withinDays: 30 },
                  ],
                })
              }
              size="sm"
              variant="ghost"
            >
              Add event condition
            </Button>
            <Button
              icon={Plus}
              onClick={() =>
                setDef({
                  ...def,
                  properties: [
                    ...(def.properties ?? []),
                    { property: props[0]?.value ?? '', op: 'eq', value: '' },
                  ],
                })
              }
              size="sm"
              variant="ghost"
            >
              Add property condition
            </Button>
          </div>
        </div>
        {preview?.sample.length ? (
          <div className="text-xs text-slate-500">
            For example:{' '}
            <span className="text-slate-700">{preview.sample.slice(0, 8).join(', ')}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function Cohorts({ sources }: { sources: Sources }): JSX.Element {
  const confirm = useConfirm();
  const [list, setList] = useState<Cohort[] | null>(null);
  const [editing, setEditing] = useState<Cohort | 'new' | null>(null);
  const load = useCallback(() => {
    insightsApi
      .cohorts()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useEffect(load, [load]);
  if (!sources.integrations.length)
    return (
      <EmptyState
        description="Cohorts are groups of people in your app. Add an SDK integration first."
        icon={Users}
        title="No SDK integration yet"
      />
    );
  const appName = (id: string) => sources.integrations.find((i) => i.id === id)?.name ?? 'App';
  return (
    <div className="grid gap-4" data-testid="cohorts">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-slate-600">
          Saved groups of people, by what they did and their properties. Use them as a filter in any
          insight.
        </p>
        <Button icon={Plus} onClick={() => setEditing('new')} size="sm" variant="primary">
          New cohort
        </Button>
      </div>
      {list == null ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : list.length === 0 ? (
        <EmptyState
          description="For example: people who bought twice in 30 days, or who signed up but never returned."
          icon={Users}
          title="No cohorts yet"
        />
      ) : (
        <Card>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {list.map((c) => (
              <li
                className="flex flex-wrap items-center gap-3 px-4 py-3"
                data-testid="cohort-row"
                key={c.id}
              >
                <div className="min-w-0 flex-1">
                  <button
                    className="text-left text-[13px] font-medium text-slate-900 hover:text-brand-700"
                    onClick={() => setEditing(c)}
                    type="button"
                  >
                    {c.name}
                  </button>
                  <div className="text-xs text-slate-500">
                    {appName(c.integrationId)} ·{' '}
                    {c.definition.rules
                      .map(
                        (r) =>
                          `${r.kind === 'did' ? 'did' : 'did not do'} ${r.event}${r.kind === 'did' && (r.count ?? 1) > 1 ? ` ${r.count}×` : ''} in ${r.withinDays}d`,
                      )
                      .join(c.definition.match === 'all' ? ' and ' : ' or ')}
                  </div>
                </div>
                <span className="font-mono text-[13px] tabular-nums text-slate-700">
                  {c.lastCount == null ? '—' : `${fmt(c.lastCount)} people`}
                </span>
                <Button
                  aria-label={`Delete ${c.name}`}
                  icon={Trash2}
                  onClick={async () => {
                    if (
                      !(await confirm({
                        title: `Delete "${c.name}"?`,
                        message: 'Insights that filter by it will show everyone instead.',
                        confirmText: 'Delete cohort',
                        type: 'danger',
                      }))
                    )
                      return;
                    await insightsApi.deleteCohort(c.id);
                    load();
                  }}
                  size="icon-sm"
                  variant="ghost"
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {editing ? (
        <CohortEditor
          cohort={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          sources={sources}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alerts                                                               */
/* ------------------------------------------------------------------ */

export interface AlertSeed {
  source: Source;
  integrationId: string | null;
  metric: SeriesSpec;
  /** The chart was limited to a cohort, which alerts cannot use. */
  cohortDropped?: boolean;
}

const WINDOWS = [
  { value: '1', label: 'Last hour' },
  { value: '6', label: 'Last 6 hours' },
  { value: '24', label: 'Last 24 hours' },
  { value: '168', label: 'Last 7 days' },
];

function AlertEditor({
  sources,
  alert,
  seed,
  onClose,
  onSaved,
}: {
  sources: Sources;
  alert: MetricAlert | null;
  seed: AlertSeed | null;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const start = alert ?? seed;
  const [source, setSource] = useState<Source>(
    start?.source ?? (sources.integrations.length ? 'events' : 'pristine'),
  );
  const [integrationId, setIntegrationId] = useState<string | null>(
    start?.integrationId ?? sources.integrations[0]?.id ?? null,
  );
  const [metric, setMetric] = useState<SeriesSpec>(start?.metric ?? { event: '', math: 'total' });
  const [name, setName] = useState(alert?.name ?? '');
  const [condition, setCondition] = useState<AlertCondition>(alert?.condition ?? 'above');
  const [threshold, setThreshold] = useState(String(alert?.threshold ?? ''));
  const [windowHours, setWindowHours] = useState(String(alert?.windowHours ?? 24));
  const [events, setEvents] = useState<Array<{ value: string; label: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (source === 'pristine') {
      setEvents(sources.metrics.map((m) => ({ value: m.id, label: m.label })));
      return;
    }
    if (!integrationId) return;
    insightsApi
      .schema(integrationId)
      .then((s) => setEvents(s.events.map((e) => ({ value: e.name, label: e.name }))))
      .catch(() => setEvents([]));
  }, [source, integrationId, sources.metrics]);
  useEffect(() => {
    if (!metric.event && events[0]) setMetric((m) => ({ ...m, event: events[0].value }));
  }, [events]);

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = {
      name: name.trim(),
      source,
      integrationId: source === 'events' ? integrationId : null,
      metric,
      condition,
      threshold: Number(threshold),
      windowHours: Number(windowHours),
    };
    try {
      if (alert) await insightsApi.updateAlert(alert.id, body);
      else await insightsApi.createAlert(body);
      onSaved();
    } catch (e) {
      setError(toDisplayErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const change = condition === 'change_up' || condition === 'change_down';
  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || !metric.event || threshold === ''}
            loading={busy}
            onClick={() => void save()}
            variant="primary"
          >
            {alert ? 'Save changes' : 'Create alert'}
          </Button>
        </>
      }
      maxWidth="max-w-[600px]"
      onClose={onClose}
      title={alert ? `Edit ${alert.name}` : 'New alert'}
    >
      <div className="grid gap-3">
        {error ? (
          <p
            className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
            data-testid="alert-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Field label="Name">
          <Input
            autoFocus
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            placeholder="Signups dropped"
            value={name}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data">
            <Select
              onValueChange={(v) => {
                setMetric({ event: '', math: 'total' });
                if (v === 'pristine') {
                  setSource('pristine');
                  setIntegrationId(null);
                } else {
                  setSource('events');
                  setIntegrationId(v.slice(7));
                }
              }}
              options={[
                ...sources.integrations.map((i) => ({ value: `events:${i.id}`, label: i.name })),
                { value: 'pristine', label: 'Pristine (tasks, agents, AI)' },
              ]}
              value={source === 'pristine' ? 'pristine' : `events:${integrationId ?? ''}`}
            />
          </Field>
          <Field label="Metric">
            <Select
              aria-label="Metric"
              onValueChange={(v) => setMetric({ ...metric, event: v })}
              options={events.length ? events : [{ value: '', label: 'No events yet' }]}
              placeholder="Choose"
              value={metric.event}
            />
          </Field>
          <Field label="Measure">
            <Select
              aria-label="Measure"
              onValueChange={(v) => setMetric({ ...metric, math: v as MathOp })}
              options={(Object.keys(MATH_LABELS) as MathOp[])
                .filter((m) => (m !== 'sum' && m !== 'average') || Boolean(metric.property))
                .map((m) => ({
                  value: m,
                  label:
                    m === 'sum' || m === 'average'
                      ? `${m === 'sum' ? 'Sum' : 'Average'} of ${metric.property}`
                      : MATH_LABELS[m],
                }))}
              value={metric.math}
            />
          </Field>
          <Field label="Over">
            <Select
              aria-label="Window"
              onValueChange={setWindowHours}
              options={WINDOWS}
              value={windowHours}
            />
          </Field>
          <Field label="Fire when it">
            <Select
              aria-label="Condition"
              onValueChange={(v) => setCondition(v as AlertCondition)}
              options={(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((c) => ({
                value: c,
                label: CONDITION_LABELS[c],
              }))}
              value={condition}
            />
          </Field>
          <Field
            hint={change ? 'Compared with the window before.' : undefined}
            label={change ? 'Percent' : 'Threshold'}
          >
            <Input
              aria-label="Threshold"
              min={0}
              onChange={(e) => setThreshold(e.target.value)}
              type="number"
              value={threshold}
            />
          </Field>
        </div>
        {metric.filters?.length ? (
          <p className="m-0 text-xs text-slate-600" data-testid="alert-filters">
            Only events where{' '}
            {metric.filters
              .map((f) =>
                [
                  f.property,
                  FILTER_OP_LABELS[f.op],
                  f.op === 'set' || f.op === 'not_set' ? '' : String(f.value ?? ''),
                ]
                  .filter(Boolean)
                  .join(' '),
              )
              .join(' and ')}
            .
          </p>
        ) : null}
        {!alert && seed?.cohortDropped ? (
          <p
            className="m-0 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
            role="status"
          >
            The chart was limited to a cohort. Alerts watch everyone, so the number here can be
            higher than on the chart.
          </p>
        ) : null}
        <p className="m-0 text-xs text-slate-500">
          Checked every 5 minutes. When it fires, a task is opened for you; it closes by itself when
          the metric is back to normal.
        </p>
      </div>
    </Modal>
  );
}

const STATE = {
  ok: { label: 'Normal', tone: 'success' as const, icon: CheckCircle2 },
  firing: { label: 'Firing', tone: 'danger' as const, icon: BellRing },
  no_data: { label: 'No data', tone: 'neutral' as const, icon: CircleDashed },
};

export function Alerts({
  sources,
  seed,
  onSeedUsed,
  highlight,
}: {
  sources: Sources;
  seed: AlertSeed | null;
  onSeedUsed: () => void;
  highlight?: string | null;
}): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<MetricAlert[] | null>(null);
  const [editing, setEditing] = useState<MetricAlert | 'new' | null>(seed ? 'new' : null);
  const [checking, setChecking] = useState<string | null>(null);
  const load = useCallback(() => {
    insightsApi
      .alerts()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  const check = async (a: MetricAlert) => {
    setChecking(a.id);
    try {
      const r = await insightsApi.checkAlert(a.id);
      showToast({
        variant: r.outcome === 'fired' ? 'info' : 'success',
        message:
          r.outcome === 'fired'
            ? `"${a.name}" fired: a task was opened`
            : r.outcome === 'recovered'
              ? `"${a.name}" is back to normal: its task was closed`
              : `Checked: ${STATE[r.alert.state].label.toLowerCase()}`,
      });
      load();
    } catch (e) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="grid gap-4" data-testid="alerts">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-slate-600">
          Watch a metric and get a task when it crosses a line.
        </p>
        <Button icon={Plus} onClick={() => setEditing('new')} size="sm" variant="primary">
          New alert
        </Button>
      </div>
      {list == null ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : list.length === 0 ? (
        <EmptyState
          description="For example: signups fall by more than 30% day on day, or AI cost goes above $50 a day."
          icon={BellRing}
          title="No alerts yet"
        />
      ) : (
        <Card>
          <CardHeader
            description="Checked every 5 minutes."
            icon={<BellRing className="h-4 w-4 text-slate-400" />}
            title={`${list.length} alert${list.length === 1 ? '' : 's'}`}
          />
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {list.map((a) => {
              const s = STATE[a.state];
              return (
                <li
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3',
                    highlight === a.id && 'bg-amber-50/60',
                  )}
                  data-testid="alert-row"
                  key={a.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="text-left text-[13px] font-medium text-slate-900 hover:text-brand-700"
                        onClick={() => setEditing(a)}
                        type="button"
                      >
                        {a.name}
                      </button>
                      <Badge tone={s.tone}>
                        <s.icon aria-hidden className="h-3 w-3" /> {a.enabled ? s.label : 'Off'}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {a.metric.event} {CONDITION_LABELS[a.condition]} {a.threshold} over{' '}
                      {WINDOWS.find((w) => w.value === String(a.windowHours))?.label.toLowerCase()}
                      {a.lastDetail ? ` · now ${a.lastDetail}` : ''}
                      {a.lastEvaluatedAt ? ` · checked ${timeAgo(a.lastEvaluatedAt)}` : ''}
                    </div>
                  </div>
                  {a.openTask ? (
                    <Link
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      to={taskLink(a.openTask.taskId, a.openTask.projectId)}
                    >
                      Open task
                    </Link>
                  ) : null}
                  <Switch
                    aria-label={`Turn ${a.name} ${a.enabled ? 'off' : 'on'}`}
                    checked={a.enabled}
                    onChange={async () => {
                      try {
                        await insightsApi.updateAlert(a.id, { enabled: !a.enabled });
                        load();
                      } catch (e) {
                        showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
                      }
                    }}
                  />
                  <Button
                    aria-label={`Check ${a.name} now`}
                    disabled={!a.enabled}
                    icon={RefreshCw}
                    loading={checking === a.id}
                    onClick={() => void check(a)}
                    size="icon-sm"
                    title="Check now"
                    variant="ghost"
                  />
                  <Button
                    aria-label={`Delete ${a.name}`}
                    icon={Trash2}
                    onClick={async () => {
                      if (
                        !(await confirm({
                          title: `Delete "${a.name}"?`,
                          message: 'Its open task, if any, is closed.',
                          confirmText: 'Delete alert',
                          type: 'danger',
                        }))
                      )
                        return;
                      await insightsApi.deleteAlert(a.id);
                      load();
                    }}
                    size="icon-sm"
                    variant="ghost"
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {editing ? (
        <AlertEditor
          alert={editing === 'new' ? null : editing}
          onClose={() => {
            setEditing(null);
            onSeedUsed();
          }}
          onSaved={() => {
            setEditing(null);
            onSeedUsed();
            load();
          }}
          seed={editing === 'new' ? seed : null}
          sources={sources}
        />
      ) : null}
    </div>
  );
}
