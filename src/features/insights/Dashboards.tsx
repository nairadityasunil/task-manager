import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LayoutDashboard, MoreHorizontal, Plus, RefreshCw, Trash2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { Button, Card, Field, Input, Menu, Select, cn } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import {
  RANGE_OPTIONS,
  insightsApi,
  type Dashboard,
  type DashboardPanel,
  type QueryResult,
  type RangeKey,
  type SavedInsight,
} from '@/services/insights';
import { timeAgo } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { ResultView } from './ResultView';

const REFRESH_OPTIONS = [
  { value: '0', label: 'Refresh: off' },
  { value: '60', label: 'Every minute' },
  { value: '300', label: 'Every 5 minutes' },
  { value: '900', label: 'Every 15 minutes' },
];
const WIDTH_CLASS: Record<number, string> = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
};

/** One panel: runs its insight for the dashboard's range and draws it. */
function Panel({
  panel,
  insight,
  range,
  tick,
  onOpen,
  onWidth,
  onRemove,
}: {
  panel: DashboardPanel;
  insight: SavedInsight | undefined;
  range: RangeKey;
  tick: number;
  onOpen: () => void;
  onWidth: (w: DashboardPanel['width']) => void;
  onRemove: () => void;
}): JSX.Element {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  useEffect(() => {
    if (!insight) return;
    const id = (latest.current += 1);
    insightsApi
      .runSaved(insight.id, range)
      .then((r) => {
        if (id !== latest.current) return;
        setResult(r.result);
        setError(null);
      })
      .catch((e) => id === latest.current && setError(toDisplayErrorMessage(e)));
  }, [insight, range, tick]);

  return (
    <Card
      className={cn('col-span-12 flex min-w-0 flex-col', WIDTH_CLASS[panel.width])}
      data-testid="dashboard-panel"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <button
          className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-slate-900 hover:text-brand-700"
          onClick={onOpen}
          type="button"
        >
          {panel.title || insight?.name || 'Removed insight'}
        </button>
        <Menu
          items={[
            { label: 'Open in Explore', onSelect: onOpen },
            ...([3, 4, 6, 8, 12] as const).map((w) => ({
              label: `Width: ${w === 12 ? 'full' : `${w}/12`}${panel.width === w ? ' ✓' : ''}`,
              onSelect: () => onWidth(w),
            })),
            'separator' as const,
            { label: 'Remove from dashboard', onSelect: onRemove, danger: true },
          ]}
          trigger={
            <Button
              aria-label={`Panel options for ${insight?.name ?? 'panel'}`}
              icon={MoreHorizontal}
              size="icon-sm"
              variant="ghost"
            />
          }
        />
      </div>
      <div className="min-h-[200px] p-4">
        {!insight ? (
          <p className="m-0 text-[13px] text-slate-500">This insight was deleted.</p>
        ) : error ? (
          <p className="m-0 text-[13px] text-red-700" role="alert">
            {error}
          </p>
        ) : result ? (
          <ResultView
            height={200}
            insightName={insight.name}
            link="/insights/dashboards"
            result={result}
            visualization={panel.visualization ?? insight.visualization}
          />
        ) : (
          <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
        )}
      </div>
    </Card>
  );
}

function DashboardView({
  id,
  onBack,
  onOpenInsight,
}: {
  id: string;
  onBack: () => void;
  onOpenInsight: (insight: SavedInsight) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [saved, setSaved] = useState<SavedInsight[]>([]);
  const [tick, setTick] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState('');

  const load = useCallback(() => {
    insightsApi
      .dashboard(id)
      .then(setDashboard)
      .catch((e) => showToast({ variant: 'error', message: toDisplayErrorMessage(e) }));
  }, [id, showToast]);
  useEffect(load, [load]);
  useEffect(() => {
    insightsApi
      .saved()
      .then(setSaved)
      .catch(() => setSaved([]));
  }, []);

  // Auto-refresh, as often as the dashboard says; paused while the tab is hidden.
  useEffect(() => {
    if (!dashboard?.refreshSeconds) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setTick((t) => t + 1);
      setRefreshedAt(Date.now());
    }, dashboard.refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [dashboard?.refreshSeconds]);

  const update = async (patch: Partial<Dashboard>) => {
    if (!dashboard) return;
    const previous = dashboard;
    setDashboard({ ...dashboard, ...patch });
    try {
      const next = await insightsApi.updateDashboard(dashboard.id, patch);
      setDashboard((d) => (d ? { ...d, ...next, insights: d.insights } : d));
    } catch (e) {
      setDashboard(previous);
      showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
    }
  };

  if (!dashboard) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  const insightById = new Map([...(dashboard.insights ?? []), ...saved].map((i) => [i.id, i]));

  return (
    <div className="grid gap-4" data-testid="dashboard-view">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={ArrowLeft} onClick={onBack} size="sm" variant="ghost">
          Dashboards
        </Button>
        <h2 className="m-0 min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
          {dashboard.name}
        </h2>
        <Select
          aria-label="Dashboard time range"
          className="w-40"
          onValueChange={(v) => void update({ range: v as RangeKey })}
          options={RANGE_OPTIONS}
          value={dashboard.range}
        />
        <Select
          aria-label="Auto refresh"
          className="w-44"
          onValueChange={(v) => void update({ refreshSeconds: Number(v) })}
          options={REFRESH_OPTIONS}
          value={String(dashboard.refreshSeconds)}
        />
        <Button
          aria-label="Refresh now"
          icon={RefreshCw}
          onClick={() => {
            setTick((t) => t + 1);
            setRefreshedAt(Date.now());
          }}
          size="icon-sm"
          title={`Updated ${timeAgo(new Date(refreshedAt).toISOString())}`}
        />
        <Button icon={Plus} onClick={() => setAdding(true)} size="sm" variant="primary">
          Add panel
        </Button>
        <Button
          aria-label="Delete dashboard"
          icon={Trash2}
          onClick={async () => {
            if (
              !(await confirm({
                title: `Delete "${dashboard.name}"?`,
                message: 'The saved insights on it are kept.',
                confirmText: 'Delete dashboard',
                type: 'danger',
              }))
            )
              return;
            await insightsApi.deleteDashboard(dashboard.id);
            onBack();
          }}
          size="icon-sm"
          variant="ghost"
        />
      </div>
      {dashboard.panels.length === 0 ? (
        <EmptyState
          description="Save an insight in Explore, then add it here."
          icon={LayoutDashboard}
          title="This dashboard has no panels"
        />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {dashboard.panels.map((panel) => {
            const insight = insightById.get(panel.insightId);
            return (
              <Panel
                insight={insight}
                key={panel.id}
                onOpen={() => insight && onOpenInsight(insight)}
                onRemove={() =>
                  void update({ panels: dashboard.panels.filter((p) => p.id !== panel.id) })
                }
                onWidth={(width) =>
                  void update({
                    panels: dashboard.panels.map((p) => (p.id === panel.id ? { ...p, width } : p)),
                  })
                }
                panel={panel}
                range={dashboard.range}
                tick={tick}
              />
            );
          })}
        </div>
      )}
      {adding ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setAdding(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                disabled={!pick}
                onClick={() => {
                  void update({
                    panels: [
                      ...dashboard.panels,
                      { id: `p${Date.now().toString(36)}`, insightId: pick, width: 6 },
                    ],
                  });
                  setAdding(false);
                  setPick('');
                }}
                variant="primary"
              >
                Add panel
              </Button>
            </>
          }
          onClose={() => setAdding(false)}
          title="Add a panel"
        >
          {saved.length ? (
            <Field label="Saved insight">
              <Select
                aria-label="Saved insight"
                onValueChange={setPick}
                options={saved.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Choose an insight"
                value={pick}
              />
            </Field>
          ) : (
            <p className="m-0 text-[13px] text-slate-600">
              No saved insights yet. Build one in Explore and press Save.
            </p>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

export function Dashboards({
  openId,
  onOpen,
  onOpenInsight,
}: {
  openId: string | null;
  onOpen: (id: string | null) => void;
  onOpenInsight: (insight: SavedInsight) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [list, setList] = useState<Dashboard[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => {
    if (openId) return;
    insightsApi
      .dashboards()
      .then(setList)
      .catch(() => setList([]));
  }, [openId]);

  if (openId)
    return <DashboardView id={openId} onBack={() => onOpen(null)} onOpenInsight={onOpenInsight} />;
  return (
    <div className="grid gap-4" data-testid="dashboards">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-slate-600">
          Panels of saved insights with a shared time range and automatic refresh.
        </p>
        <Button icon={Plus} onClick={() => setCreating(true)} size="sm" variant="primary">
          New dashboard
        </Button>
      </div>
      {list == null ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : list.length === 0 ? (
        <EmptyState
          description="Group saved insights into a dashboard to watch them together."
          icon={LayoutDashboard}
          title="No dashboards yet"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <button
              className="card-hover rounded-xl border border-slate-200 bg-white p-4 text-left"
              data-testid="dashboard-card"
              key={d.id}
              onClick={() => onOpen(d.id)}
              type="button"
            >
              <div className="text-[14px] font-semibold text-slate-900">{d.name}</div>
              <div className="mt-1 text-xs text-slate-500">
                {d.panels.length} panel{d.panels.length === 1 ? '' : 's'} ·{' '}
                {RANGE_OPTIONS.find((r) => r.value === d.range)?.label ?? d.range}
                {d.refreshSeconds
                  ? ` · refreshes every ${d.refreshSeconds >= 60 ? `${d.refreshSeconds / 60} min` : `${d.refreshSeconds}s`}`
                  : ''}
              </div>
            </button>
          ))}
        </div>
      )}
      {creating ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setCreating(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                disabled={!name.trim()}
                onClick={async () => {
                  try {
                    const d = await insightsApi.createDashboard({ name: name.trim() });
                    setCreating(false);
                    setName('');
                    onOpen(d.id);
                  } catch (e) {
                    showToast({ variant: 'error', message: toDisplayErrorMessage(e) });
                  }
                }}
                variant="primary"
              >
                Create
              </Button>
            </>
          }
          onClose={() => setCreating(false)}
          title="New dashboard"
        >
          <Field label="Name">
            <Input
              autoFocus
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Growth"
              value={name}
            />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}
