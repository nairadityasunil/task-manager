import { ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';

import { ADMIN_TABS, AdminLayout, type AdminTab } from './AdminLayout';
import { AnalyticsTab } from './AnalyticsTab';
import { AuditTab } from './AuditTab';
import { EmailTemplatesTab } from './EmailTemplatesTab';
import { UsersTab } from './UsersTab';
import { WorkspacesTab } from './WorkspacesTab';

/**
 * The platform admin console (super admins only), on its own page with its own sidebar: analytics, every
 * person, every workspace, the emails the platform sends, and the log of admin changes.
 */
export function AdminPage(): JSX.Element {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: AdminTab = ADMIN_TABS.some((t) => t.value === raw) ? (raw as AdminTab) : 'analytics';

  if (!user?.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" data-testid="admin-page">
        <EmptyState description="Only platform admins can open this page." icon={ShieldCheck} title="No access" />
        <p className="mt-4 text-center text-sm">
          <Link className="text-brand-700 underline" to="/dashboard">
            Back to the app
          </Link>
        </p>
      </div>
    );
  }

  return (
    <AdminLayout onTab={(next) => setParams(next === 'analytics' ? {} : { tab: next }, { replace: true })} tab={tab}>
      {tab === 'analytics' ? <AnalyticsTab /> : tab === 'users' ? <UsersTab currentUserId={user.id} /> : tab === 'workspaces' ? <WorkspacesTab /> : tab === 'emails' ? <EmailTemplatesTab /> : <AuditTab />}
    </AdminLayout>
  );
}
