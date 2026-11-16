import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BarChart3, Trash2 } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card, Tabs } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { Alerts, Cohorts, type AlertSeed } from '@/features/insights/CohortsAndAlerts';
import { Dashboards } from '@/features/insights/Dashboards';
import { Explore } from '@/features/insights/Explore';
import { timeAgo } from '@/services/agents';
import { KIND_LABELS, insightsApi, type SavedInsight, type Sources } from '@/services/insights';

type Tab = 'explore' | 'saved' | 'dashboards' | 'cohorts' | 'alerts';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'explore', label: 'Explore' },
  { value: 'saved', label: 'Saved' },
  { value: 'dashboards', label: 'Dashboards' },
  { value: 'cohorts', label: 'Cohorts' },
  { value: 'alerts', label: 'Alerts' },
];

function SavedList({ onOpen }: { onOpen: (insight: SavedInsight) => void }): JSX.Element {
  const confirm = useConfirm();
  const [list, setList] = useState<SavedInsight[] | null>(null);
  const load = () =>
    insightsApi
      .saved()
      .then(setList)
      .catch(() => setList([]));
  useEffect(() => {
    void load();
  }, []);
  if (list == null) return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />;
  if (!list.length)
    return (
      <EmptyState
        description="Build a chart in Explore and press Save."
        icon={BarChart3}
        title="No saved insights yet"
      />
    );
  return (
    <Card data-testid="saved-insights">
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {list.map((i) => (
          <li
            className="flex flex-wrap items-center gap-3 px-4 py-3"
            data-testid="saved-row"
            key={i.id}
          >
            <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(i)} type="button">
              <span className="block truncate text-[13px] font-medium text-slate-900 hover:text-brand-700">
                {i.name}
              </span>
              <span className="text-xs text-slate-500">
                {KIND_LABELS[i.kind]} ·{' '}
                {i.source === 'pristine' ? 'Pristine metrics' : 'Product events'} · updated{' '}
                {timeAgo(i.updatedAt)}
              </span>
            </button>
            <Badge tone="neutral">{i.visualization}</Badge>
            <Button
              aria-label={`Delete ${i.name}`}
              icon={Trash2}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: `Delete "${i.name}"?`,
                    message: 'It is also removed from any dashboard that shows it.',
                    confirmText: 'Delete insight',
                    type: 'danger',
                  }))
                )
                  return;
                await insightsApi.deleteSaved(i.id);
                void load();
              }}
              size="icon-sm"
              variant="ghost"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Product analytics in Pristine: explore events, save insights, build dashboards, define cohorts and set alerts. */
export default function InsightsPage(): JSX.Element {
  const params = useParams<{ tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab: Tab = TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'explore';
  const [sources, setSources] = useState<Sources | null>(null);
  const [opened, setOpened] = useState<SavedInsight | null>(null);
  const [exploreKey, setExploreKey] = useState(0);
  const [alertSeed, setAlertSeed] = useState<AlertSeed | null>(null);

  useEffect(() => {
    insightsApi
      .sources()
      .then(setSources)
      .catch(() => setSources({ integrations: [], metrics: [] }));
  }, []);

  const go = (next: Tab) => navigate(next === 'explore' ? '/insights' : `/insights/${next}`);
  const openInsight = (insight: SavedInsight) => {
    setOpened(insight);
    setExploreKey((k) => k + 1);
    go('explore');
  };

  return (
    <div data-testid="insights-page">
      <PageHeader
        actions={
          tab === 'explore' && opened ? (
            <Button
              onClick={() => {
                setOpened(null);
                setExploreKey((k) => k + 1);
              }}
              size="sm"
            >
              New insight
            </Button>
          ) : null
        }
        description="Trends, funnels, retention and paths over your app's events, plus dashboards and alerts."
        icon={BarChart3}
        title="Insights"
        tone="sky"
      >
        <Tabs items={TABS} onChange={go} value={tab} />
      </PageHeader>
      <div className="px-3 py-4 sm:px-5 lg:px-6">
        {!sources ? (
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        ) : tab === 'explore' ? (
          <Explore
            initial={opened}
            key={exploreKey}
            onCreateAlert={(seed) => {
              setAlertSeed(seed);
              go('alerts');
            }}
            onSaved={setOpened}
            sources={sources}
          />
        ) : tab === 'saved' ? (
          <SavedList onOpen={openInsight} />
        ) : tab === 'dashboards' ? (
          <Dashboards
            onOpen={(id) => {
              const next = new URLSearchParams(searchParams);
              if (id) next.set('dashboard', id);
              else next.delete('dashboard');
              setSearchParams(next);
            }}
            onOpenInsight={openInsight}
            openId={searchParams.get('dashboard')}
          />
        ) : tab === 'cohorts' ? (
          <Cohorts sources={sources} />
        ) : (
          <Alerts
            highlight={searchParams.get('alert')}
            onSeedUsed={() => setAlertSeed(null)}
            seed={alertSeed}
            sources={sources}
          />
        )}
      </div>
    </div>
  );
}
