import React, { useState } from 'react';
import { Trash2, Shield } from 'lucide-react';
import type { WorkspaceMember, WorkspaceRole } from '../types/workspace';
import { ROLE_HIERARCHY } from '../types/workspace';
import { Badge, Button, selectClass, type BadgeTone } from '@/components/ui';

interface WorkspaceMemberRowProps {
  member: WorkspaceMember;
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  onUpdateRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['ADMIN', 'MANAGER', 'MEMBER', 'GUEST'];

const ROLE_TONES: Record<WorkspaceRole, BadgeTone> = {
  OWNER: 'dark',
  ADMIN: 'info',
  MANAGER: 'success',
  MEMBER: 'neutral',
  GUEST: 'warning',
};

export function WorkspaceMemberRow({
  member,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemove,
}: WorkspaceMemberRowProps): JSX.Element {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const isSelf = member.userId === currentUserId;
  const actorRank = ROLE_HIERARCHY[currentUserRole];
  const targetRank = ROLE_HIERARCHY[member.role];
  const canModify = actorRank > targetRank && !isSelf && currentUserRole !== 'MEMBER' && currentUserRole !== 'GUEST';
  const canAssignOwner = currentUserRole === 'OWNER';

  const availableRoles = canAssignOwner
    ? (['OWNER', ...ASSIGNABLE_ROLES] as WorkspaceRole[])
    : ASSIGNABLE_ROLES;

  const handleRoleChange = async (newRole: WorkspaceRole) => {
    if (!canModify && !(canAssignOwner && newRole === 'OWNER')) return;
    setIsUpdating(true);
    try {
      await onUpdateRole(member.userId, newRole);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (!canModify) return;
    setIsRemoving(true);
    try {
      await onRemove(member.userId);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 px-3.5 py-3 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
          <span className="text-xs font-semibold text-slate-600">
            {(member.name || member.email).charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-900">
              {member.name || 'Unknown'}
            </span>
            {isSelf && <Badge tone="neutral">You</Badge>}
            {member.role === 'OWNER' && <Shield className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          </div>
          <div className="truncate text-[13px] text-slate-500">{member.email}</div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
        {canModify ? (
          <select
            value={member.role}
            onChange={(e) => void handleRoleChange(e.target.value as WorkspaceRole)}
            disabled={isUpdating}
            aria-label={`Role for ${member.name || member.email}`}
            className={`${selectClass} h-8 w-auto text-[13px]`}
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <Badge tone={ROLE_TONES[member.role]}>{member.role}</Badge>
        )}

        {canModify ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void handleRemove()}
            disabled={isRemoving}
            title="Remove member"
            aria-label="Remove member"
            className="text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span className="hidden w-8 sm:block" aria-hidden />
        )}
      </div>
    </li>
  );
}

export default WorkspaceMemberRow;
