import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Users,
  ArrowRightLeft,
} from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces';
import { rememberActiveWorkspace } from '@/features/workspaces/context/WorkspaceContext';
import workspaceService from '@/features/workspaces/services/workspaceService';
import socketService, { SocketEvents } from '@/services/socket';
import {
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
  type PendingInvitation,
} from '@/services/invitations';
import {
  getMyProjectTransfers,
  acceptProjectTransfer,
  rejectProjectTransfer,
} from '@/services/projects';
import type { ProjectTransferRequest } from '@/types/project';

interface AdminNotification {
  id: string;
  kind: 'accepted' | 'rejected';
  projectName: string;
  personName: string;
  personEmail: string;
  timestamp: Date;
}

const formatRelative = (date?: Date | string): string => {
  if (!date) return 'Just now';
  const d = date instanceof Date ? date : new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function InvitationNotificationPanel() {
  const { refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [myInvitations, setMyInvitations] = useState<PendingInvitation[]>([]);
  const [myTransfers, setMyTransfers] = useState<ProjectTransferRequest[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [actioning, setActioning] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const totalCount = myInvitations.length + myTransfers.length + adminNotifications.length;

  const loadMyInvitations = useCallback(async () => {
    try {
      const [invitations, transfers] = await Promise.all([
        getMyInvitations(),
        getMyProjectTransfers().catch(() => []),
      ]);
      setMyInvitations(invitations);
      setMyTransfers(transfers);
    } catch {
      // silently fail — not critical
    }
  }, []);

  useEffect(() => {
    void loadMyInvitations();
    const interval = setInterval(() => {
      void loadMyInvitations();
    }, 30_000);

    // Real-time: someone sent me an invite
    const onReceived = (data: PendingInvitation) => {
      setMyInvitations((prev) => {
        if (prev.some((inv) => inv.id === data.id)) return prev;
        return [data, ...prev];
      });
    };

    // Real-time: someone accepted my invite (admin notification)
    const onAccepted = (data: {
      projectId: string;
      projectName: string;
      acceptedBy: string;
      acceptedByEmail: string;
    }) => {
      setAdminNotifications((prev) => [
        {
          id: `${Date.now()}`,
          kind: 'accepted',
          projectName: data.projectName,
          personName: data.acceptedBy,
          personEmail: data.acceptedByEmail,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    };

    // Real-time: someone rejected my invite
    const onRejected = (data: {
      projectId: string;
      projectName: string;
      rejectedBy: string;
      rejectedByEmail: string;
    }) => {
      setAdminNotifications((prev) => [
        {
          id: `${Date.now()}`,
          kind: 'rejected',
          projectName: data.projectName,
          personName: data.rejectedBy,
          personEmail: data.rejectedByEmail,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    };

    // Real-time: someone sent me a project ownership transfer request
    const onTransferRequest = (data: ProjectTransferRequest) => {
      setMyTransfers((prev) => {
        if (prev.some((t) => t.id === data.id)) return prev;
        return [data, ...prev];
      });
    };

    socketService.on(SocketEvents.INVITATION_RECEIVED, onReceived);
    socketService.on(SocketEvents.INVITATION_ACCEPTED, onAccepted);
    socketService.on(SocketEvents.INVITATION_REJECTED, onRejected);
    socketService.on(SocketEvents.PROJECT_TRANSFER_REQUEST, onTransferRequest);

    return () => {
      clearInterval(interval);
      socketService.off(SocketEvents.INVITATION_RECEIVED, onReceived);
      socketService.off(SocketEvents.INVITATION_ACCEPTED, onAccepted);
      socketService.off(SocketEvents.INVITATION_REJECTED, onRejected);
      socketService.off(SocketEvents.PROJECT_TRANSFER_REQUEST, onTransferRequest);
    };
  }, [loadMyInvitations]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleAccept = async (invitation: PendingInvitation) => {
    setActioning(invitation.id);
    try {
      const joined = await acceptInvitation(invitation.token);
      setMyInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
      // Joining a project moves you to the workspace it is in.
      if (joined.workspaceId) {
        rememberActiveWorkspace(joined.workspaceId);
        await workspaceService.markUsed(joined.workspaceId).catch(() => undefined);
        await refreshWorkspaces();
        navigate('/dashboard');
      }
    } catch {
      // show nothing — user can retry
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (invitation: PendingInvitation) => {
    setActioning(invitation.id);
    try {
      await rejectInvitation(invitation.token);
      setMyInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch {
      // show nothing — user can retry
    } finally {
      setActioning(null);
    }
  };

  const handleAcceptTransfer = async (transfer: ProjectTransferRequest) => {
    setActioning(transfer.id);
    try {
      await acceptProjectTransfer(transfer.token);
      setMyTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
      await refreshWorkspaces();
      navigate(`/projects/${transfer.projectId}`);
    } catch {
      // show nothing — user can retry
    } finally {
      setActioning(null);
    }
  };

  const handleRejectTransfer = async (transfer: ProjectTransferRequest) => {
    setActioning(transfer.id);
    try {
      await rejectProjectTransfer(transfer.token);
      setMyTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
    } catch {
      // show nothing — user can retry
    } finally {
      setActioning(null);
    }
  };

  const clearAdminNotification = (id: string) => {
    setAdminNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const hasNotifications = totalCount > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Inbox button (invitations and team updates; task notifications live under the bell) */}
      <button
        aria-expanded={open}
        aria-label="Invitations and team updates"
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          open ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
        onClick={() => setOpen((o) => !o)}
        title="Invitations and team updates"
        type="button"
      >
        <Inbox size={18} strokeWidth={1.9} />
        {hasNotifications ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed left-3 right-3 top-[58px] z-50 flex max-h-[min(520px,75vh)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <h3 className="m-0 text-[15px] font-semibold text-slate-900">Invitations &amp; updates</h3>
            <button
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {myTransfers.length > 0 ? (
              <div className="pb-1">
                <div className="px-4 pb-1.5 pt-3 text-xs font-medium text-slate-500">Ownership transfers</div>
                {myTransfers.map((t) => (
                  <div key={t.id} className="mx-3 mb-2 rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <ArrowRightLeft size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[13px] leading-snug text-slate-600">
                          <span className="font-medium text-slate-900">{t.currentOwnerName}</span> wants to transfer ownership of
                        </p>
                        <p className="m-0 mt-0.5 truncate text-sm font-semibold text-slate-900">{t.projectName}</p>
                        <p className="m-0 mt-1 text-xs text-slate-500">
                          Will become part of your default workspace.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={actioning === t.id}
                        icon={CheckCircle}
                        onClick={() => void handleAcceptTransfer(t)}
                        size="sm"
                        variant="primary"
                      >
                        {actioning === t.id ? 'Accepting…' : 'Accept'}
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={actioning === t.id}
                        icon={XCircle}
                        onClick={() => void handleRejectTransfer(t)}
                        size="sm"
                        variant="secondary"
                      >
                        {actioning === t.id ? 'Declining…' : 'Decline'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {myInvitations.length > 0 ? (
              <div className="pb-1">
                <div className="px-4 pb-1.5 pt-3 text-xs font-medium text-slate-500">Project invitations</div>
                {myInvitations.map((inv) => (
                  <div key={inv.id} className="mx-3 mb-2 rounded-lg border border-slate-200 p-3">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <Users size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[13px] leading-snug text-slate-600">
                          <span className="font-medium text-slate-900">{inv.inviterName}</span> invited you to
                        </p>
                        <p className="m-0 mt-0.5 truncate text-sm font-semibold text-slate-900">{inv.projectName}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge>{inv.role === 'ADMIN' ? 'Admin' : inv.role === 'MEMBER' ? 'Member' : inv.role}</Badge>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock size={11} />
                            {formatRelative(inv.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={actioning === inv.id}
                        icon={CheckCircle}
                        onClick={() => void handleAccept(inv)}
                        size="sm"
                        variant="primary"
                      >
                        {actioning === inv.id ? 'Accepting…' : 'Accept'}
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={actioning === inv.id}
                        icon={XCircle}
                        onClick={() => void handleReject(inv)}
                        size="sm"
                        variant="secondary"
                      >
                        {actioning === inv.id ? 'Declining…' : 'Decline'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {adminNotifications.length > 0 ? (
              <div className="pb-1">
                <div className="px-4 pb-1.5 pt-3 text-xs font-medium text-slate-500">Invitation updates</div>
                {adminNotifications.map((n) => (
                  <div key={n.id} className="mx-3 mb-2 flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        n.kind === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {n.kind === 'accepted' ? <CheckCircle size={15} /> : <XCircle size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[13px] font-medium leading-snug text-slate-900">{n.personName}</p>
                      <p className="m-0 mt-0.5 text-[13px] text-slate-600">
                        {n.kind === 'accepted' ? 'accepted' : 'declined'} invitation to{' '}
                        <span className="font-medium text-slate-900">{n.projectName}</span>
                      </p>
                      <p className="m-0 mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} />
                        {formatRelative(n.timestamp)}
                      </p>
                    </div>
                    <button
                      aria-label="Dismiss"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => clearAdminNotification(n.id)}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                  <Inbox size={18} />
                </div>
                <p className="m-0 text-sm font-medium text-slate-900">All caught up</p>
                <p className="m-0 mt-1 text-[13px] text-slate-500">No pending invitations or updates</p>
              </div>
            ) : null}
          </div>

          {totalCount > 0 ? (
            <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50/70 px-3 py-2">
              <Button
                onClick={() => {
                  setAdminNotifications([]);
                  setMyInvitations([]);
                }}
                size="sm"
                variant="ghost"
              >
                Clear all
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default InvitationNotificationPanel;
