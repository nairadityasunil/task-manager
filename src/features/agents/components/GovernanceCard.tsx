import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldHalf } from 'lucide-react';

import { Card, CardHeader, buttonClass, cn } from '@/components/ui';
import { useWorkspace, isAtLeastAdmin } from '@/features/workspaces';
import { agentsApi, type AgentOverview } from '@/services/agents';

/** A small summary of agent governance for the dashboard overview. */
export function GovernanceCard(): JSX.Element | null {
  const { activeWorkspace } = useWorkspace();
  const canAdmin = activeWorkspace ? isAtLeastAdmin(activeWorkspace.role) : false;
  const [overview, setOverview] = useState<AgentOverview | null>(null);

  useEffect(() => {
    agentsApi
      .overview(canAdmin ? activeWorkspace?.id : null)
      .then(setOverview)
      .catch(() => setOverview(null));
  }, [activeWorkspace?.id, canAdmin]);

  if (!overview || (!overview.stats && overview.myAgents === 0)) return null;
  const stats = overview.stats;
  const items = [
    { label: 'Active agents', value: stats?.agents.active ?? overview.myAgents, to: '/agents/inventory', alert: false },
    { label: 'Waiting for approval', value: overview.pendingApprovals, to: '/agents/approvals', alert: overview.pendingApprovals > 0 },
    { label: 'Open alerts', value: stats?.openAlerts ?? 0, to: '/agents', alert: (stats?.openAlerts ?? 0) > 0 },
    { label: 'High risk', value: (stats?.risk.high ?? 0) + (stats?.risk.critical ?? 0), to: '/agents/inventory', alert: (stats?.risk.high ?? 0) + (stats?.risk.critical ?? 0) > 0 }
  ];

  return (
    <Card className="min-w-0" data-testid="governance-card">
      <CardHeader
        actions={
          <Link className={buttonClass('ghost', 'sm')} to="/agents">
            Open <ArrowRight size={14} />
          </Link>
        }
        description="AI agents and integrations acting in your workspace"
        icon={<ShieldHalf className="h-4 w-4 text-violet-500" />}
        title="Agent governance"
      />
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            className={cn(
              'rounded-lg border px-3 py-2 transition-colors hover:border-slate-300',
              item.alert ? 'border-amber-200 bg-amber-50/60' : 'border-slate-100 bg-slate-50/70'
            )}
            key={item.label}
            to={item.to}
          >
            <div className="text-lg font-semibold tabular-nums text-slate-900">{item.value}</div>
            <div className="truncate text-xs text-slate-500">{item.label}</div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
