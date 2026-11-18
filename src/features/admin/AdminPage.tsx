import { ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';

import { ADMIN_TABS, AdminLayout, type AdminTab } from './AdminLayout';
import { AnalyticsTab } from './AnalyticsTab';
import { AuditTab } from './AuditTab';
import { EmailTemplatesTab } from './EmailTemplatesTab';
import { UsersTab } from './UsersTab';
import { WorkspacesTab } from './WorkspacesTab';

/**
 * The platform admin console (platform admins only): its own sign-in (/admin/login), its own menu, and one route per
 * section: /admin, /admin/people, /admin/workspaces, /admin/email-templates, /admin/audit.
 */
export function AdminPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams();
  const current = ADMIN_TABS.find((t) => t.slug === (section ?? ''));
  const tab: AdminTab = current?.value ?? 'analytics';

  if (!user?.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10" data-testid="admin-page">
        <EmptyState description="Only platform admins can open this page." icon={ShieldCheck} title="No access" />
        <p className="mt-4 text-center text-sm">
          <Link className="text-brand-700 underline" to="/admin/login">
            Platform admin sign-in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <AdminLayout
      onTab={(next) => navigate(`/admin${ADMIN_TABS.find((t) => t.value === next)?.slug ? `/${ADMIN_TABS.find((t) => t.value === next)?.slug}` : ''}`)}
      tab={tab}
    >
      {tab === 'analytics' ? <AnalyticsTab /> : tab === 'users' ? <UsersTab currentUserId={user.id} /> : tab === 'workspaces' ? <WorkspacesTab /> : tab === 'emails' ? <EmailTemplatesTab /> : <AuditTab />}
    </AdminLayout>
  );
}
