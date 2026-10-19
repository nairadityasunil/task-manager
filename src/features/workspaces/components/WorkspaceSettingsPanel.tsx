import React, { useState } from 'react';
import { Settings2, Users, AlertTriangle, Loader2, Building2 } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { WorkspaceGeneralSettings } from './WorkspaceGeneralSettings';
import { WorkspaceMembers } from './WorkspaceMembers';
import { WorkspaceDangerZone } from './WorkspaceDangerZone';
import { useAuth } from '@/context/AuthContext';
import { Badge, Card } from '@/components/ui';
import EmptyState from '@/components/EmptyState';

type Tab = 'general' | 'members' | 'danger';

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'general', label: 'General', icon: <Settings2 className="h-4 w-4" /> },
  { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" /> },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="h-4 w-4" /> },
];

export function WorkspaceSettingsPanel(): JSX.Element {
  const { activeWorkspace, isLoading } = useWorkspace();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center py-16 font-sans text-[13px] text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading workspace…
      </Card>
    );
  }

  if (!activeWorkspace) {
    return (
      <EmptyState
        icon={Building2}
        title="No workspace selected"
        description="No workspace selected. Create or select one above."
      />
    );
  }

  return (
    <Card className="font-sans">
      {/* Workspace identity */}
      <div className="flex items-center gap-3.5 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-base font-semibold text-white">
          {activeWorkspace.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="m-0 truncate text-[15px] font-semibold text-slate-900">{activeWorkspace.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-mono text-xs text-slate-500">{activeWorkspace.slug}</span>
            <Badge tone="neutral">
              {activeWorkspace.role.charAt(0) + activeWorkspace.role.slice(1).toLowerCase()}
            </Badge>
            <span className="text-xs text-slate-500">
              {activeWorkspace.memberCount} member{activeWorkspace.memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="mt-4 border-b border-slate-200 px-4 sm:px-5">
        <div className="-mb-px flex gap-5 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => {
            if (tab.id === 'danger' && activeWorkspace.role !== 'OWNER') return null;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                  active
                    ? tab.id === 'danger'
                      ? 'border-red-600 text-red-700'
                      : 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-5">
        {activeTab === 'general' && <WorkspaceGeneralSettings workspace={activeWorkspace} />}
        {activeTab === 'members' && user && (
          <WorkspaceMembers workspace={activeWorkspace} currentUserId={user.id} />
        )}
        {activeTab === 'danger' && <WorkspaceDangerZone workspace={activeWorkspace} />}
      </div>
    </Card>
  );
}

export default WorkspaceSettingsPanel;
