import { useEffect, useMemo, useRef, useState } from 'react';
import { BellPlus, LayoutDashboard, Plus, Save, Trash2, X } from 'lucide-react';

import Modal from '@/components/Modal';
import { Badge, Button, Card, Field, Input, Select, Switch, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import {
  FILTER_OP_LABELS,
  KIND_LABELS,
  MATH_LABELS,
  RANGE_OPTIONS,
  insightsApi,
  type Cohort,
  type EventSchema,
  type FilterOp,
  type InsightKind,
  type InsightQuery,
  type MathOp,
  type PropertyFilter,
  type QueryResult,
  type RangeKey,
  type SavedInsight,
  type SeriesSpec,
  type Source,
  type Sources,
  type Visualization,
} from '@/services/insights';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { ResultView } from './ResultView';

export interface ExploreState {
  kind: InsightKind;
  source: Source;
  integrationId: string | null;
  query: InsightQuery;
  visualization: Visualization;
  range: RangeKey;
}

export const defaultState = (sources: Sources | null): ExploreState => ({
  kind: 'trends',
  source: sources?.integrations.length ? 'events' : 'pristine',
  integrationId: sources?.integrations[0]?.id ?? null,
  query: { series: [{ event: '', math: 'total' }] },
  visualization: 'line',
  range: '7d',
});

const KINDS: InsightKind[] = ['trends', 'funnel', 'retention', 'paths'];
const OPS = Object.keys(FILTER_OP_LABELS) as FilterOp[];

/** A row of filters: property, operator, value. */
function FiltersEditor({
  value,
  onChange,
  properties,
}: {
  value: PropertyFilter[];
  onChange: (next: PropertyFilter[]) => void;
  properties: string[];
}): JSX.Element {
  return (
    <div className="grid gap-2">
      {value.map((f, i) => (
        <div className="flex flex-wrap items-center gap-2" data-testid="filter-row" key={i}>
          <Select
            aria-label="Filter property"
            className="w-44"
            onValueChange={(v) =>
              onChange(value.map((x, j) => (j === i ? { ...x, property: v } : x)))
            }
            options={[...new Set([f.property, ...properties].filter(Boolean))].map((p) => ({
              value: p,
              label: p,
            }))}
            placeholder="Property"
            value={f.property}
          />
          <Select
            aria-label="Filter operator"
            className="w-40"
            onValueChange={(v) =>
              onChange(value.map((x, j) => (j === i ? { ...x, op: v as FilterOp } : x)))
            }
            options={OPS.map((o) => ({ value: o, label: FILTER_OP_LABELS[o] }))}
            value={f.op}
          />
          {f.op !== 'set' && f.op !== 'not_set' ? (
            <Input
              aria-label="Filter value"
              className="w-40"
              onChange={(e) =>
                onChange(value.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
              }
              placeholder="Value"
              value={String(f.value ?? '')}
            />
          ) : null}
          <Button
            aria-label="Remove filter"
            icon={X}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            size="icon-sm"
            variant="ghost"
          />
        </div>
      ))}
      <div>
        <Button
          icon={Plus}
          onClick={() =>
            onChange([...value, { property: properties[0] ?? '', op: 'eq', value: '' }])
          }
          size="sm"
          variant="ghost"
        >
          Add filter
        </Button>
      </div>
    </div>
  );
}

function SaveDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}): JSX.Element {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSave(name.trim());
              } catch (e) {
                setError(toDisplayErrorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
            variant="primary"
          >
            Save
          </Button>
        </>
      }
      onClose={onClose}
      title="Save insight"
    >
      <Field error={error ?? undefined} label="Name">
        <Input autoFocus maxLength={120} onChange={(e) => setName(e.target.value)} value={name} />
      </Field>
    </Modal>
  );
}

function AddToDashboardDialog({
  insightId,
  onClose,
}: {
  insightId: string;
  onClose: () => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [dashboards, setDashboards] = useState<Array<{
    id: string;
    name: string;
    panels: unknown[];
  }> | null>(null);
  const [target, setTarget] = useState('new');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    insightsApi
      .dashboards()
      .then((d) => {
        setDashboards(d);
        if (d[0]) setTarget(d[0].id);
      })
      .catch(() => setDashboards([]));
  }, []);
  const add = async () => {
    setBusy(true);
    try {
      if (target === 'new') {
        await insightsApi.createDashboard({
          name: name.trim(),
          panels: [{ id: 'p1', insightId, width: 6 }],
        });
      } else {
        const d = await insightsApi.dashboard(target);
        await insightsApi.updateDashboard(target, {
          panels: [...d.panels, { id: `p${Date.now().toString(36)}`, insightId, width: 6 }],
        });
      }
      showToast({ variant: 'success', message: 'Added to the dashboard' });
      onClose();
    } catch (e) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={target === 'new' && !name.trim()}
            loading={busy}
            onClick={() => void add()}
            variant="primary"
          >
            Add
          </Button>
        </>
      }
      onClose={onClose}
      title="Add to dashboard"
    >
      <div className="grid gap-3">
        <Field label="Dashboard">
          <Select
            onValueChange={setTarget}
            options={[
              ...(dashboards ?? []).map((d) => ({ value: d.id, label: d.name })),
              { value: 'new', label: 'New dashboard…' },
            ]}
            value={target}
          />
        </Field>
        {target === 'new' ? (
          <Field label="Name of the new dashboard">
            <Input
              autoFocus
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Growth"
              value={name}
            />
          </Field>
        ) : null}
      </div>
    </Modal>
  );
}

/** The query builder: pick what to measure, see the chart, save it, put it on a dashboard or alert on it. */
export function Explore({
  sources,
  initial,
  onSaved,
  onCreateAlert,
}: {
  sources: Sources;
  initial?: SavedInsight | null;
  onSaved?: (insight: SavedInsight) => void;
  onCreateAlert?: (seed: {
    source: Source;
    integrationId: string | null;
    metric: SeriesSpec;
    cohortDropped?: boolean;
  }) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [state, setState] = useState<ExploreState>(() =>
    initial
      ? {
          kind: initial.kind,
          source: initial.source,
          integrationId: initial.integrationId,
          query: initial.query,
          visualization: initial.visualization,
          range: '7d',
        }
      : defaultState(sources),
  );
  const [saved, setSaved] = useState<SavedInsight | null>(initial ?? null);
  const [schema, setSchema] = useState<EventSchema | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<false | 'update' | 'new'>(false);
  const [adding, setAdding] = useState(false);
  const latest = useRef(0);

  const q = state.query;
  const set = (patch: Partial<ExploreState>) => setState((s) => ({ ...s, ...patch }));
  const setQuery = (patch: Partial<InsightQuery>) =>
    setState((s) => ({ ...s, query: { ...s.query, ...patch } }));

  useEffect(() => {
    if (state.source !== 'events' || !state.integrationId) {
      setSchema(null);
      setCohorts([]);
      return;
    }
    insightsApi
      .schema(state.integrationId)
      .then(setSchema)
      .catch(() => setSchema(null));
    insightsApi
      .cohorts(state.integrationId)
      .then(setCohorts)
      .catch(() => setCohorts([]));
  }, [state.source, state.integrationId]);

  const events = useMemo(
    () =>
      state.source === 'pristine'
        ? sources.metrics.map((m) => ({ value: m.id, label: m.label }))
        : (schema?.events ?? []).map((e) => ({ value: e.name, label: `${e.name} (${e.count})` })),
    [state.source, schema, sources.metrics],
  );
  const properties = useMemo(
    () =>
      state.source === 'pristine'
        ? ['project', 'priority', 'outcome', 'risk', 'provider', 'model', 'cost', 'tokens']
        : (schema?.properties ?? []).map((p) => p.name),
    [state.source, schema],
  );

  // Fill in empty event pickers once the event list arrives (it may arrive after the insight type was chosen),
  // so every insight type shows something straight away.
  useEffect(() => {
    if (!events.length) return;
    const first = events[0].value;
    const second = events[1]?.value ?? first;
    setState((s) => {
      const q0 = s.query;
      if (s.kind === 'trends' && q0.series?.length && !q0.series[0].event) {
        return {
          ...s,
          query: { ...q0, series: [{ ...q0.series[0], event: first }, ...q0.series.slice(1)] },
        };
      }
      if (s.kind === 'funnel' && (q0.steps ?? []).some((x) => !x.event)) {
        return {
          ...s,
          query: {
            ...q0,
            steps: (q0.steps ?? []).map((x, i) =>
              x.event ? x : { event: i === 0 ? first : second },
            ),
          },
        };
      }
      if (s.kind === 'retention' && (!q0.startEvent || !q0.returnEvent)) {
        return {
          ...s,
          query: {
            ...q0,
            startEvent: q0.startEvent || first,
            returnEvent: q0.returnEvent || q0.startEvent || first,
          },
        };
      }
      return s;
    });
  }, [events, state.kind]);

  const ready =
    state.kind === 'trends'
      ? Boolean(
          q.series?.some(
            (s) => s.event && ((s.math !== 'sum' && s.math !== 'average') || s.property),
          ),
        )
      : state.kind === 'funnel'
        ? (q.steps ?? []).filter((s) => s.event).length >= 2
        : state.kind === 'retention'
          ? Boolean(q.startEvent)
          : true;

  // Runs the query shortly after the last change; only the newest answer is shown.
  useEffect(() => {
    if (!ready || (state.source === 'events' && !state.integrationId)) {
      setResult(null);
      return;
    }
    const id = (latest.current += 1);
    setLoading(true);
    const timer = window.setTimeout(() => {
      insightsApi
        .query({
          kind: state.kind,
          source: state.source,
          integrationId: state.integrationId,
          query: q,
          range: state.range,
        })
        .then((r) => {
          if (id !== latest.current) return;
          setResult(r);
          setError(null);
        })
        .catch((e) => id === latest.current && setError(toDisplayErrorMessage(e)))
        .finally(() => id === latest.current && setLoading(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [ready, state.kind, state.source, state.integrationId, state.range, JSON.stringify(q)]);

  const changeKind = (kind: InsightKind) => {
    const first = events[0]?.value ?? '';
    const second = events[1]?.value ?? first;
    const query: InsightQuery =
      kind === 'trends'
        ? { series: [{ event: first, math: 'total' }] }
        : kind === 'funnel'
          ? { steps: [{ event: first }, { event: second }], windowHours: 24 * 7 }
          : kind === 'retention'
            ? { startEvent: first, returnEvent: first, period: 'day', periods: 8 }
            : { startEvent: null, depth: 3 };
    setResult(null);
    set({
      kind,
      query,
      visualization: kind === 'trends' ? 'line' : 'table',
      ...(kind !== 'trends'
        ? {
            source: 'events',
            integrationId: state.integrationId ?? sources.integrations[0]?.id ?? null,
          }
        : {}),
    });
  };

  const sourceOptions = [
    ...sources.integrations.map((i) => ({
      value: `events:${i.id}`,
      label: `${i.name} (product events)`,
    })),
    ...(state.kind === 'trends'
      ? [{ value: 'pristine', label: 'Pristine (tasks, agents, AI)' }]
      : []),
  ];
  const sourceValue =
    state.source === 'pristine' ? 'pristine' : `events:${state.integrationId ?? ''}`;

  const save = async (name: string) => {
    const body = {
      name,
      kind: state.kind,
      source: state.source,
      integrationId: state.integrationId,
      query: q,
      visualization: state.visualization,
    };
    const update = Boolean(saved) && saving === 'update';
    const out =
      update && saved
        ? await insightsApi.updateSaved(saved.id, body)
        : await insightsApi.save(body);
    setSaved(out);
    setSaving(false);
    showToast({ variant: 'success', message: update ? 'Insight updated' : 'Insight saved' });
    onSaved?.(out);
  };

  const series = q.series ?? [];
  const eventSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <Select
      aria-label={label}
      className="w-56"
      onValueChange={onChange}
      options={events.length ? events : [{ value: '', label: 'No events yet' }]}
      placeholder="Choose an event"
      value={value}
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]" data-testid="explore">
      <Card className="h-fit">
        <div className="grid gap-4 p-4">
          <div className="inline-flex w-full rounded-md bg-slate-100 p-0.5" role="tablist">
            {KINDS.map((k) => (
              <button
                aria-selected={state.kind === k}
                className={cn(
                  'h-7 flex-1 rounded px-2 text-[13px] font-medium',
                  state.kind === k
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900',
                )}
                key={k}
                onClick={() => changeKind(k)}
                role="tab"
                type="button"
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>

          <Field label="Data">
            <Select
              aria-label="Data source"
              onValueChange={(v) => {
                setResult(null);
                if (v === 'pristine')
                  set({
                    source: 'pristine',
                    integrationId: null,
                    query: { series: [{ event: sources.metrics[0]?.id ?? '', math: 'total' }] },
                  });
                else
                  set({
                    source: 'events',
                    integrationId: v.slice(7),
                    query:
                      state.kind === 'trends'
                        ? { series: [{ event: '', math: 'total' }] }
                        : state.query,
                  });
              }}
              options={
                sourceOptions.length
                  ? sourceOptions
                  : [{ value: '', label: 'Add an SDK integration first' }]
              }
              value={sourceValue}
            />
          </Field>

          {state.kind === 'trends' ? (
            <div className="grid gap-3">
              {series.map((s, i) => (
                <div
                  className="grid gap-2 rounded-lg border border-slate-200 p-2.5"
                  data-testid="series-row"
                  key={i}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-100 font-mono text-[11px] text-slate-600">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {eventSelect(
                      s.event,
                      (v) =>
                        setQuery({
                          series: series.map((x, j) => (j === i ? { ...x, event: v } : x)),
                        }),
                      `Series ${i + 1} event`,
                    )}
                    {series.length > 1 ? (
                      <Button
                        aria-label="Remove series"
                        icon={Trash2}
                        onClick={() => setQuery({ series: series.filter((_, j) => j !== i) })}
                        size="icon-sm"
                        variant="ghost"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      aria-label={`Series ${i + 1} measure`}
                      className="w-44"
                      onValueChange={(v) =>
                        setQuery({
                          series: series.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  math: v as MathOp,
                                  property:
                                    v === 'sum' || v === 'average'
                                      ? (x.property ?? properties[0] ?? null)
                                      : null,
                                }
                              : x,
                          ),
                        })
                      }
                      options={(Object.keys(MATH_LABELS) as MathOp[])
                        .filter(
                          (m) =>
                            state.source === 'events' ||
                            m === 'total' ||
                            m === 'sum' ||
                            m === 'average',
                        )
                        .map((m) => ({ value: m, label: MATH_LABELS[m] }))}
                      value={s.math}
                    />
                    {s.math === 'sum' || s.math === 'average' ? (
                      <Select
                        aria-label={`Series ${i + 1} property`}
                        className="w-36"
                        onValueChange={(v) =>
                          setQuery({
                            series: series.map((x, j) => (j === i ? { ...x, property: v } : x)),
                          })
                        }
                        options={properties.map((p) => ({ value: p, label: p }))}
                        placeholder="Property"
                        value={s.property ?? ''}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
              {series.length < 8 ? (
                <div>
                  <Button
                    icon={Plus}
                    onClick={() =>
                      setQuery({
                        series: [...series, { event: events[0]?.value ?? '', math: 'total' }],
                      })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    Add series
                  </Button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Break down by">
                  <Select
                    aria-label="Break down by"
                    onValueChange={(v) => setQuery({ breakdown: v || null })}
                    options={[
                      { value: '', label: 'Nothing' },
                      ...properties.map((p) => ({ value: p, label: p })),
                    ]}
                    value={q.breakdown ?? ''}
                  />
                </Field>
                <Field label="Interval">
                  <Select
                    aria-label="Interval"
                    onValueChange={(v) =>
                      setQuery({ interval: (v || null) as InsightQuery['interval'] })
                    }
                    options={[
                      { value: '', label: 'Automatic' },
                      { value: 'hour', label: 'Hour' },
                      { value: 'day', label: 'Day' },
                      { value: 'week', label: 'Week' },
                    ]}
                    value={q.interval ?? ''}
                  />
                </Field>
              </div>
              <label className="flex items-center justify-between gap-3 text-[13px] text-slate-700">
                Compare with the previous period
                <Switch
                  aria-label="Compare with the previous period"
                  checked={Boolean(q.compare)}
                  onChange={() => setQuery({ compare: !q.compare })}
                />
              </label>
            </div>
          ) : null}

          {state.kind === 'funnel' ? (
            <div className="grid gap-2">
              {(q.steps ?? []).map((s, i) => (
                <div className="flex items-center gap-2" data-testid="funnel-step-row" key={i}>
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-slate-100 font-mono text-[11px] text-slate-600">
                    {i + 1}
                  </span>
                  {eventSelect(
                    s.event,
                    (v) =>
                      setQuery({
                        steps: (q.steps ?? []).map((x, j) => (j === i ? { event: v } : x)),
                      }),
                    `Step ${i + 1}`,
                  )}
                  {(q.steps ?? []).length > 2 ? (
                    <Button
                      aria-label={`Remove step ${i + 1}`}
                      icon={X}
                      onClick={() => setQuery({ steps: (q.steps ?? []).filter((_, j) => j !== i) })}
                      size="icon-sm"
                      variant="ghost"
                    />
                  ) : null}
                </div>
              ))}
              {(q.steps ?? []).length < 10 ? (
                <div>
                  <Button
                    icon={Plus}
                    onClick={() =>
                      setQuery({ steps: [...(q.steps ?? []), { event: events[0]?.value ?? '' }] })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    Add step
                  </Button>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Finish within">
                  <Select
                    aria-label="Finish within"
                    onValueChange={(v) => setQuery({ windowHours: Number(v) })}
                    options={[
                      { value: '1', label: '1 hour' },
                      { value: '24', label: '1 day' },
                      { value: '168', label: '7 days' },
                      { value: '720', label: '30 days' },
                    ]}
                    value={String(q.windowHours ?? 168)}
                  />
                </Field>
                <Field label="Count by">
                  <Select
                    aria-label="Count by"
                    onValueChange={(v) => setQuery({ by: v as 'user' | 'session' })}
                    options={[
                      { value: 'user', label: 'People' },
                      { value: 'session', label: 'Sessions' },
                    ]}
                    value={q.by ?? 'user'}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {state.kind === 'retention' ? (
            <div className="grid gap-2">
              <Field label="People who did">
                {eventSelect(q.startEvent ?? '', (v) => setQuery({ startEvent: v }), 'Start event')}
              </Field>
              <Field label="and came back to do">
                {eventSelect(
                  q.returnEvent ?? q.startEvent ?? '',
                  (v) => setQuery({ returnEvent: v }),
                  'Return event',
                )}
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Period">
                  <Select
                    aria-label="Period"
                    onValueChange={(v) => setQuery({ period: v as 'day' | 'week' })}
                    options={[
                      { value: 'day', label: 'Daily' },
                      { value: 'week', label: 'Weekly' },
                    ]}
                    value={q.period ?? 'day'}
                  />
                </Field>
                <Field label="Periods">
                  <Select
                    aria-label="Periods"
                    onValueChange={(v) => setQuery({ periods: Number(v) })}
                    options={[4, 8, 12].map((n) => ({ value: String(n), label: String(n) }))}
                    value={String(q.periods ?? 8)}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {state.kind === 'paths' ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Starting from">
                <Select
                  aria-label="Starting from"
                  onValueChange={(v) => setQuery({ startEvent: v || null })}
                  options={[{ value: '', label: 'Any event' }, ...events]}
                  value={q.startEvent ?? ''}
                />
              </Field>
              <Field label="Steps">
                <Select
                  aria-label="Steps"
                  onValueChange={(v) => setQuery({ depth: Number(v) })}
                  options={[2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
                  value={String(q.depth ?? 3)}
                />
              </Field>
            </div>
          ) : null}

          <div className="grid gap-2 border-t border-slate-100 pt-3">
            <span className="text-[13px] font-medium text-slate-700">Filters</span>
            <FiltersEditor
              onChange={(filters) => setQuery({ filters })}
              properties={properties}
              value={q.filters ?? []}
            />
            {state.source === 'events' && cohorts.length ? (
              <Field label="Only people in cohort">
                <Select
                  aria-label="Cohort"
                  onValueChange={(v) => setQuery({ cohortId: v || null })}
                  options={[
                    { value: '', label: 'Everyone' },
                    ...cohorts.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.lastCount ?? '?'})`,
                    })),
                  ]}
                  value={q.cohortId ?? ''}
                />
              </Field>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-slate-900">
              {saved?.name ?? 'New insight'}
            </div>
            <div className="text-xs text-slate-500">
              {KIND_LABELS[state.kind]}
              {loading ? ' · updating…' : ''}
            </div>
          </div>
          <Select
            aria-label="Time range"
            className="w-40"
            onValueChange={(v) => set({ range: v as RangeKey })}
            options={RANGE_OPTIONS}
            value={state.range}
          />
          {state.kind === 'trends' ? (
            <div className="inline-flex rounded-md bg-slate-100 p-0.5" role="group">
              {(['line', 'bar', 'number', 'table'] as Visualization[]).map((v) => (
                <button
                  aria-pressed={state.visualization === v}
                  className={cn(
                    'h-7 rounded px-2 text-xs font-medium capitalize',
                    state.visualization === v
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                  key={v}
                  onClick={() => set({ visualization: v })}
                  type="button"
                >
                  {v}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="p-4" data-testid="explore-result">
          {error ? (
            <p
              className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : !ready ? (
            <p className="m-0 py-10 text-center text-[13px] text-slate-500">
              {state.kind === 'funnel' ? 'Choose at least two steps.' : 'Choose what to measure.'}
            </p>
          ) : result ? (
            <div className={cn(loading && 'opacity-60 transition-opacity')}>
              <ResultView
                insightName={saved?.name}
                result={result}
                visualization={state.visualization}
              />
            </div>
          ) : (
            <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          {saved ? <Badge tone="neutral">Saved</Badge> : null}
          <Button
            disabled={!ready}
            icon={Save}
            onClick={() => setSaving(saved ? 'update' : 'new')}
            size="sm"
            variant="primary"
          >
            {saved ? 'Save changes' : 'Save'}
          </Button>
          {saved ? (
            <Button disabled={!ready} onClick={() => setSaving('new')} size="sm">
              Save as new
            </Button>
          ) : null}
          <Button
            disabled={!saved}
            icon={LayoutDashboard}
            onClick={() => setAdding(true)}
            size="sm"
            title={saved ? undefined : 'Save the insight first'}
          >
            Add to dashboard
          </Button>
          {state.kind === 'trends' && onCreateAlert ? (
            <Button
              disabled={!ready}
              icon={BellPlus}
              onClick={() => {
                const first = series.find((s) => s.event);
                if (first)
                  onCreateAlert({
                    source: state.source,
                    integrationId: state.integrationId,
                    metric: {
                      ...first,
                      filters: [...(first.filters ?? []), ...(q.filters ?? [])].slice(0, 20),
                    },
                    cohortDropped: Boolean(q.cohortId),
                  });
              }}
              size="sm"
            >
              Create alert
            </Button>
          ) : null}
        </div>
      </Card>

      {saving ? (
        <SaveDialog
          initial={saving === 'new' && saved ? `${saved.name} (copy)` : (saved?.name ?? '')}
          onClose={() => setSaving(false)}
          onSave={save}
        />
      ) : null}
      {adding && saved ? (
        <AddToDashboardDialog insightId={saved.id} onClose={() => setAdding(false)} />
      ) : null}
    </div>
  );
}
