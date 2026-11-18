import { BarChart3, Building2, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import { Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

import { AnalyticsTab } from './AnalyticsTab';
import { AuditTab } from './AuditTab';
import { UsersTab } from './UsersTab';
import { WorkspacesTab } from './WorkspacesTab';

type Tab = 'analytics' | 'users' | 'workspaces' | 'audit';

/** The platform admin panel: analytics, every person, every workspace, and the log of admin changes. */
export function AdminPage(): JSX.Element {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'users' || raw === 'workspaces' || raw === 'audit' ? raw : 'analytics';

  if (!user?.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState description="Only platform admins can open this page." icon={ShieldCheck} title="No access" />
      </div>
    );
  }

  return (
    <div data-testid="admin-page">
      <PageHeader description="Everyone on the platform, how it is used, and a record of what admins change." icon={ShieldCheck} title="Platform admin">
        <Tabs<Tab>
          items={[
            { value: 'analytics', label: 'Analytics', icon: BarChart3 },
            { value: 'users', label: 'People', icon: Users },
            { value: 'workspaces', label: 'Workspaces', icon: Building2 },
            { value: 'audit', label: 'Audit log', icon: ScrollText },
          ]}
          onChange={(value) => setParams(value === 'analytics' ? {} : { tab: value }, { replace: true })}
          value={tab}
        />
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-6">
      {tab === 'analytics' ? <AnalyticsTab /> : tab === 'users' ? <UsersTab currentUserId={user.id} /> : tab === 'workspaces' ? <WorkspacesTab /> : <AuditTab />}
      </div>
    </div>
  );
}
