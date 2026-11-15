import { useNavigate, useParams } from 'react-router-dom';
import { Gauge } from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import { Tabs } from '@/components/ui';
import { AutomationPanel } from '@/features/telemetry/AutomationPanel';
import { HealthSignals } from '@/features/telemetry/HealthSignals';
import { AgentMetrics, GovernanceMetrics, PeoplePanel } from '@/features/telemetry/MetricsPanels';
import type { Project } from '@/types/project';

type Tab = 'overview' | 'automation' | 'governance' | 'agents' | 'people';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'automation', label: 'Automation' },
  { value: 'governance', label: 'Governance' },
  { value: 'agents', label: 'Agents & AI' },
  { value: 'people', label: 'People' },
];

/** Telemetry that stays inside Pristine: health, the tasks it opens by itself, and how governance, agents and users are doing. */
export default function TelemetryPage({ projects }: { projects: Project[] }): JSX.Element {
  const params = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab: Tab = TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'overview';

  return (
    <div data-testid="telemetry-page">
      <PageHeader
        description="Live health, the tasks Pristine opens from what it sees, and whether the fixes worked."
        icon={Gauge}
        title="Telemetry"
        tone="sky"
      >
        <Tabs
          items={TABS}
          onChange={(next) => navigate(next === 'overview' ? '/telemetry' : `/telemetry/${next}`)}
          value={tab}
        />
      </PageHeader>
      <div className="space-y-4 px-3 py-4 sm:px-5 lg:px-6">
        {tab === 'overview' ? (
          <>
            <HealthSignals />
            <AutomationPanel compact projects={projects} />
          </>
        ) : null}
        {tab === 'automation' ? <AutomationPanel projects={projects} /> : null}
        {tab === 'governance' ? <GovernanceMetrics /> : null}
        {tab === 'agents' ? <AgentMetrics /> : null}
        {tab === 'people' ? <PeoplePanel /> : null}
      </div>
    </div>
  );
}
