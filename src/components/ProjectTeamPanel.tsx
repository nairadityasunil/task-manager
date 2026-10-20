import { useState, useEffect, useCallback } from 'react';
import { LogOut, Shield, Trash2, UserPlus, Mail, RotateCcw } from 'lucide-react';
import { Badge, Button, inputClass, selectClass } from '@/components/ui';
import type { ProjectMember } from '@/types/project';
import { getProjectInvitations, revokeInvitation, type ProjectInvitation } from '@/services/invitations';

interface ProjectTeamPanelProps {
  canManageTeam: boolean;
  currentUserId: string | null;
  isMutating: boolean;
  members: ProjectMember[];
  projectId: string;
  onInviteMember: (email: string, role: 'ADMIN' | 'MEMBER') => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onLeaveProject: () => Promise<void>;
}

const formatRelative = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function ProjectTeamPanel({
  canManageTeam,
  currentUserId,
  isMutating,
  members,
  projectId,
  onInviteMember,
  onRemoveMember,
  onLeaveProject
}: ProjectTeamPanelProps): JSX.Element {
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadPendingInvitations = useCallback(async () => {
    if (!canManageTeam || !projectId) return;
    try {
      const invitations = await getProjectInvitations(projectId);
      setPendingInvitations(invitations);
    } catch {
      // silently fail
    }
  }, [canManageTeam, projectId]);

  useEffect(() => {
    void loadPendingInvitations();
  }, [loadPendingInvitations]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await onInviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      // Reload pending invitations list
      await loadPendingInvitations();
    } catch {
      // Handled by parent error state/toast
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevoke = async (invitation: ProjectInvitation) => {
    setRevokingId(invitation.id);
    try {
      await revokeInvitation(invitation.id);
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch {
      // silently fail
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="grid">
      {/* Members */}
      <div className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">Project members</h3>
          <Badge>{members.length} {members.length === 1 ? 'member' : 'members'}</Badge>
        </div>

        <ul className="m-0 grid max-h-[18rem] list-none divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 p-0">
          {members.map((member) => {
            const isAdmin = member.role === 'ADMIN';
            const isCurrentUser = member.userId === currentUserId;
            const initial = member.user?.name ? member.user.name[0].toUpperCase() : (member.user?.email ? member.user.email[0].toUpperCase() : '?');

            return (
              <li key={member.userId} className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                      {initial}
                    </div>
                    {isAdmin && (
                      <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white bg-slate-900 p-[2px] text-white" title="Admin">
                        <Shield size={8} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
                      <span className="truncate">{member.user?.name || member.user?.email || 'Unknown Member'}</span>
                      {isCurrentUser && <Badge className="shrink-0">You</Badge>}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {member.user?.email ?? member.role}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="hidden sm:inline-flex">
                    <Badge tone={isAdmin ? 'dark' : 'neutral'}>{isAdmin ? 'Admin' : 'Member'}</Badge>
                  </span>
                  {isCurrentUser ? (
                    <Button
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={isMutating}
                      icon={LogOut}
                      onClick={() => void onLeaveProject()}
                      size="sm"
                      variant="ghost"
                    >
                      Leave
                    </Button>
                  ) : null}

                  {canManageTeam && member.userId !== currentUserId ? (
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      disabled={isMutating || isAdmin}
                      onClick={() => void onRemoveMember(member.userId)}
                      title={isAdmin ? 'Project admins cannot be removed' : 'Remove member'}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pending invitations */}
      {canManageTeam && pendingInvitations.length > 0 ? (
        <div className="grid gap-3 border-t border-slate-200 p-4">
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">
            Pending invitations <span className="font-normal text-slate-400">({pendingInvitations.length})</span>
          </h3>
          <ul className="m-0 grid list-none divide-y divide-slate-100 rounded-xl border border-dashed border-slate-300 p-0">
            {pendingInvitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Mail size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{inv.email}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{inv.role === 'ADMIN' ? 'Admin' : 'Member'}</span>
                      {inv.createdAt ? (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>Invited {formatRelative(inv.createdAt)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  disabled={revokingId === inv.id}
                  onClick={() => void handleRevoke(inv)}
                  title="Revoke invitation"
                  type="button"
                >
                  {revokingId === inv.id ? <RotateCcw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Invite */}
      {canManageTeam ? (
        <form onSubmit={handleSendInvite} className="grid gap-3 border-t border-slate-200 bg-slate-50/70 p-4">
          <div>
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">Add team member</h3>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">
              Registered users get an in-app invitation; anyone else gets an email to sign up and join.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Email address"
              className={`${inputClass} sm:flex-1`}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter user's email address"
              required
              type="email"
              value={inviteEmail}
            />
            <select
              aria-label="Role"
              className={`${selectClass} sm:w-32`}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button disabled={isMutating} icon={UserPlus} loading={inviteLoading} type="submit" variant="primary">
              Send Invite
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-[13px] text-slate-500 sm:px-5">
          You can view the team here. Admins manage membership changes.
        </div>
      )}
    </section>
  );
}

export default ProjectTeamPanel;
