import React, { useState } from 'react';
import { Users, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { WorkspaceMemberRow } from './WorkspaceMemberRow';
import { InviteMemberDialog } from './InviteMemberDialog';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import type { Workspace, WorkspaceRole } from '../types/workspace';
import { isAtLeastAdmin } from '../types/workspace';
import { Button } from '@/components/ui';
import EmptyState from '@/components/EmptyState';

interface WorkspaceMembersProps {
  workspace: Workspace;
  currentUserId: string;
}

export function WorkspaceMembers({ workspace, currentUserId }: WorkspaceMembersProps): JSX.Element {
  const { members, isLoading, error, refreshMembers, inviteMember, updateMemberRole, removeMember } =
    useWorkspaceMembers(workspace.id);
  const [showInvite, setShowInvite] = useState(false);

  const canInvite = isAtLeastAdmin(workspace.role);

  const handleInvite = async (email: string, role: WorkspaceRole) => {
    await inviteMember(email, role);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <h4 className="m-0 text-sm font-semibold text-slate-900">
            Members <span className="font-normal text-slate-500">({members.length})</span>
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void refreshMembers()}
            disabled={isLoading}
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {canInvite && (
            <Button size="sm" variant="primary" icon={UserPlus} onClick={() => setShowInvite(true)}>
              Invite
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {isLoading && members.length === 0 ? (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
          <p className="sr-only">Loading members…</p>
        </div>
      ) : members.length === 0 ? (
        <EmptyState compact icon={Users} title="No members found" description="Invite teammates to collaborate in this workspace." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="hidden grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
            <span>Member</span>
            <span className="pr-10">Role</span>
          </div>
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {members.map((m) => (
              <WorkspaceMemberRow
                key={m.id}
                member={m}
                currentUserId={currentUserId}
                currentUserRole={workspace.role}
                onUpdateRole={updateMemberRole}
                onRemove={removeMember}
              />
            ))}
          </ul>
        </div>
      )}

      {showInvite && (
        <InviteMemberDialog
          workspaceName={workspace.name}
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}

export default WorkspaceMembers;
