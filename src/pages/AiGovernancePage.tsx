import { ClipboardCheck, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import { Button, Tabs } from '@/components/ui';
import { OverviewPanel } from '@/features/ai-governance/OverviewPanel';
import {
  Discovery,
  IssuesPanel,
  NewUseCaseModal,
  SettingsPanel,
  UseCaseList,
} from '@/features/ai-governance/Panels';
import { UseCaseDetail, type DetailTab } from '@/features/ai-governance/UseCaseDetail';
import { aiGovApi, type AiType, type Catalog } from '@/services/aiGovernance';

type Tab = 'overview' | 'use-cases' | 'discovery' | 'issues' | 'settings';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'use-cases', label: 'Use cases' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'issues', label: 'Issues' },
  { value: 'settings', label: 'Settings' },
];
const DETAIL_TABS: DetailTab[] = [
  'summary',
  'assessment',
  'factsheet',
  'risks',
  'evaluations',
  'approvals',
  'issues',
  'history',
];

type Preset = { name: string; type: AiType; links: Record<string, string[]> };

/** AI governance: the inventory of AI use cases, their risk, approvals, evaluations and issues. */
export default function AiGovernancePage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const parts = location.pathname.split('/').filter(Boolean).slice(1);
  const detailId = parts[0] === 'use-cases' && parts[1] ? parts[1] : null;
  const tab: Tab = TABS.some((t) => t.value === parts[0]) ? (parts[0] as Tab) : 'overview';
  const detailTab: DetailTab = DETAIL_TABS.includes(searchParams.get('tab') as DetailTab)
    ? (searchParams.get('tab') as DetailTab)
    : 'summary';
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [creating, setCreating] = useState<Preset | true | null>(null);

  useEffect(() => {
    aiGovApi
      .catalog()
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const go = (next: Tab) =>
    navigate(next === 'overview' ? '/ai-governance' : `/ai-governance/${next}`);
  const open = (id: string) => navigate(`/ai-governance/use-cases/${id}`);

  return (
    <div data-testid="ai-governance-page">
      <PageHeader
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)} variant="primary">
            Register use case
          </Button>
        }
        description="Know every way your organisation uses AI, how risky it is, who approved it and whether it still behaves."
        icon={ClipboardCheck}
        title="AI Governance"
        tone="violet"
      >
        <Tabs items={TABS} onChange={go} value={detailId ? 'use-cases' : tab} />
      </PageHeader>
      <div className="px-3 py-4 sm:px-5 lg:px-6">
        {detailId ? (
          catalog ? (
            <UseCaseDetail
              catalog={catalog}
              id={detailId}
              key={detailId}
              onBack={() => go('use-cases')}
              onTab={(t) => setSearchParams(t === 'summary' ? {} : { tab: t })}
              tab={detailTab}
            />
          ) : (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          )
        ) : tab === 'overview' ? (
          <OverviewPanel onGo={go} onNew={() => setCreating(true)} onOpen={open} />
        ) : tab === 'use-cases' ? (
          <UseCaseList onNew={() => setCreating(true)} onOpen={open} />
        ) : tab === 'discovery' ? (
          <Discovery onRegister={(preset) => setCreating(preset)} />
        ) : tab === 'issues' ? (
          <IssuesPanel />
        ) : (
          <SettingsPanel />
        )}
      </div>
      {creating ? (
        <NewUseCaseModal
          onClose={() => setCreating(null)}
          onCreated={(id) => {
            setCreating(null);
            open(id);
          }}
          preset={creating === true ? null : creating}
        />
      ) : null}
    </div>
  );
}
