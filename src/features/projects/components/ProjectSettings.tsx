import { ArrowRightLeft, Bot, CheckSquare, Clock, FileText, Info, Lock, Pencil, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import Modal from '@/components/Modal';
import { Badge, Button, Checkbox, Input, Tabs, avatarColor, initialsOf } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import socketService, { SocketEvents } from '@/services/socket';
import { getActiveProjectTransfer, initiateProjectTransfer, updateMemberPermissions } from '@/services/projects';
import { ProjectSlaPanel } from './ProjectSlaPanel';
import { PROJECT_FEATURES, PROJECT_FEATURE_INFO, type ActiveProjectTransfer, type Project, type ProjectFeature, type ProjectMember, type ProjectPermissions } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';

type Tab = 'general' | 'team' | 'access' | 'workflow' | 'sla';

interface Props {
  project: Project;
  members: ProjectMember[];
  currentUserId: string | null;
  isAdmin: boolean;
  /** What the signed-in person may use, shown to members who cannot change anything. */
  myPermissions: ProjectPermissions;
  onEditDetails: () => void;
  onChanged: () => void;
  teamPanel: ReactNode;
  workflowPanel: ReactNode;
  onOpenAiSettings: () => void;
}

const FEATURE_ICON: Record<ProjectFeature, typeof Users> = {
  editTask: CheckSquare,
  requestApproval: ShieldCheck,
  viewTeam: Users,
  editNotes: FileText,
  time: Clock,
  aiPlanner: Bot,
  prompts: Sparkles,
};

const day = (v?: string): string => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown');

/** Everything about one project in one place: details, team, who may use which feature, and workflow states. */
export function ProjectSettings({ project, members, currentUserId, isAdmin, myPermissions, onEditDetails, onChanged, teamPanel, workflowPanel, onOpenAiSettings }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('general');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [activeTransfer, setActiveTransfer] = useState<ActiveProjectTransfer | null>(null);
  const [transferCheckLoading, setTransferCheckLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setTransferCheckLoading(true);
    getActiveProjectTransfer(project.id)
      .then((res) => {
        if (!cancelled) setActiveTransfer(res);
      })
      .catch(() => {
        if (!cancelled) setActiveTransfer(null);
      })
      .finally(() => {
        if (!cancelled) setTransferCheckLoading(false);
      });

    const onTransferRejected = (data: { projectId: string; targetEmail?: string }) => {
      if (data.projectId === project.id) {
        setActiveTransfer(null);
        showToast({
          variant: 'info',
          message: 'The pending ownership transfer was rejected. Transfer lock has been released.',
        });
      }
    };

    socketService.on(SocketEvents.PROJECT_TRANSFER_REJECTED, onTransferRejected);
    return () => {
      cancelled = true;
      socketService.off(SocketEvents.PROJECT_TRANSFER_REJECTED, onTransferRejected);
    };
  }, [project.id]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center" data-testid="project-settings-forbidden">
        <p className="text-base font-semibold text-slate-800">Access Restricted</p>
        <p className="mt-1 text-sm text-slate-500">
          Project settings are only accessible to project admins. As a normal member, you can collaborate on tasks, epics, and project features allocated to you.
        </p>
      </div>
    );
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail.trim()) return;
    setTransferLoading(true);
    setTransferError('');
    try {
      const res = await initiateProjectTransfer(project.id, transferEmail.trim().toLowerCase());
      showToast({
        variant: 'success',
        message: `Ownership transfer request sent to ${transferEmail}. They will receive an email and notification to accept.`,
      });
      setIsTransferModalOpen(false);
      setTransferEmail('');
      setActiveTransfer(
        (res as { data?: ActiveProjectTransfer }).data ?? {
          id: 'new',
          targetEmail: transferEmail.trim().toLowerCase(),
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      );
    } catch (err: unknown) {
      setTransferError(toDisplayErrorMessage(err));
    } finally {
      setTransferLoading(false);
    }
  };
  return (
    <div className="flex min-h-[420px] flex-col" data-testid="project-settings">
      <div className="border-b border-slate-200 px-5 pt-3">
        <Tabs<Tab>
          items={[
            { value: 'general', label: 'General', icon: Info },
            { value: 'team', label: 'Team', icon: Users, count: members.length },
            { value: 'access', label: 'Access', icon: Sparkles },
            { value: 'workflow', label: 'Workflow' },
            { value: 'sla', label: 'SLA' },
          ]}
          onChange={setTab}
          value={tab}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'general' ? (
          <div className="grid gap-4 p-5">
            <dl className="m-0 grid gap-3 text-[13px] sm:grid-cols-2">
              <Row label="Name" value={project.name} />
              <Row label="Created" value={day(project.createdAt)} />
              <Row label="Your role" value={<Badge tone={isAdmin ? 'violet' : 'neutral'}>{isAdmin ? 'Admin' : 'Member'}</Badge>} />
              <Row label="People" value={`${members.length} on the team`} />
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Description</dt>
                <dd className="m-0 mt-0.5 whitespace-pre-wrap text-slate-900">{project.description?.trim() || <span className="text-slate-400">No description</span>}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <Button icon={Pencil} onClick={onEditDetails} variant="secondary">
                  Edit name and description
                </Button>
              ) : (
                <p className="m-0 text-[13px] text-slate-500">Only project admins can edit these details.</p>
              )}
              {isAdmin ? (
                <Button icon={Bot} onClick={onOpenAiSettings} variant="secondary">
                  AI settings
                </Button>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700" data-testid="my-access">
              <div className="mb-1.5 font-medium text-slate-900">Your access in this project</div>
              <ul className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2">
                {PROJECT_FEATURES.map((f) => (
                  <li className="flex items-center gap-2" key={f}>
                    <span aria-hidden className={myPermissions[f] ? 'text-emerald-600' : 'text-slate-400'}>
                      {myPermissions[f] ? '✓' : '✕'}
                    </span>
                    {PROJECT_FEATURE_INFO[f].label}
                    {myPermissions[f] ? null : <span className="text-xs text-slate-500">(ask a project admin)</span>}
                  </li>
                ))}
              </ul>
            </div>
            {isAdmin || project.userId === currentUserId ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-[13px]">
                <div className="font-semibold text-slate-900">Project Ownership</div>
                <p className="mt-1 text-slate-500">
                  Transfer this project to another user. The project, tasks, epics, time sheets, and members will be moved into their default workspace once accepted.
                </p>
                <div className="mt-3">
                  {activeTransfer ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left" data-testid="project-transfer-locked">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                        <Lock className="h-4 w-4 text-amber-700" />
                        Ownership Transfer Pending (Locked)
                      </div>
                      <p className="mt-1.5 text-xs text-amber-800 leading-relaxed">
                        An ownership transfer invitation is currently active and awaiting a response from{' '}
                        <strong>{activeTransfer.targetEmail}</strong>.
                      </p>
                      <p className="mt-1 text-[11px] text-amber-700">
                        Transfers remain locked until the previous invitation is accepted, rejected, or expires.
                      </p>
                      <div className="mt-3">
                        <Button
                          disabled
                          icon={Lock}
                          variant="secondary"
                          className="cursor-not-allowed opacity-60"
                        >
                          Transfer Locked (Pending Response)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      disabled={transferCheckLoading}
                      icon={ArrowRightLeft}
                      onClick={() => setIsTransferModalOpen(true)}
                      variant="secondary"
                    >
                      Transfer Project Ownership
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : tab === 'team' ? (
          <div>{teamPanel}</div>
        ) : tab === 'access' ? (
          <AccessMatrix currentUserId={currentUserId} isAdmin={isAdmin} members={members} onChanged={onChanged} projectId={project.id} />
        ) : tab === 'sla' ? (
          <ProjectSlaPanel canManage={isAdmin} onChanged={onChanged} projectId={project.id} />
        ) : (
          <div>{workflowPanel}</div>
        )}
      </div>

      {isTransferModalOpen ? (
        <Modal
          description={`Transfer ownership of "${project.name}"`}
          maxWidth="max-w-md"
          onClose={() => {
            setIsTransferModalOpen(false);
            setTransferEmail('');
            setTransferError('');
          }}
          title="Transfer Project Ownership"
        >
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            {transferError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {transferError}
              </div>
            ) : null}
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-800">
              <strong className="block font-semibold">Important</strong>
              Only one invitation can be sent at a time. The project will remain locked for new transfers until the recipient accepts or rejects this invitation. Once transferred, your role on this project will become Member.
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Recipient Email Address
              </label>
              <Input
                autoFocus
                placeholder="colleague@example.com"
                required
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                disabled={transferLoading}
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTransferEmail('');
                  setTransferError('');
                }}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={transferLoading || !transferEmail.trim()}
                loading={transferLoading}
                type="submit"
                variant="primary"
              >
                Send Transfer Request
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="m-0 mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}

function AccessMatrix({ projectId, members, isAdmin, currentUserId, onChanged }: { projectId: string; members: ProjectMember[]; isAdmin: boolean; currentUserId: string | null; onChanged: () => void }): JSX.Element {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (member: ProjectMember, feature: ProjectFeature, value: boolean): Promise<void> => {
    setBusy(`${member.userId}:${feature}`);
    try {
      await updateMemberPermissions(projectId, member.userId, { [feature]: value });
      onChanged();
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3 p-5">
      <p className="m-0 text-[13px] text-slate-600">
        {isAdmin ? 'Choose which features each member can use in this project. Admins always have all of them.' : 'These are the features each member can use. Only project admins can change them.'}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[620px] border-collapse text-[13px]" data-testid="access-matrix">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-3 py-2 font-medium">Member</th>
              {PROJECT_FEATURES.map((f) => {
                const Icon = FEATURE_ICON[f];
                return (
                  <th className="px-3 py-2 text-center font-medium" key={f} title={PROJECT_FEATURE_INFO[f].hint}>
                    <span className="inline-flex items-center gap-1">
                      <Icon size={13} /> {PROJECT_FEATURE_INFO[f].label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const name = m.user.name || m.user.email;
              return (
                <tr className="border-b border-slate-100 last:border-0" data-testid="access-row" key={m.id}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${avatarColor(m.userId)}`}>
                        {initialsOf(m.user.name, m.user.email)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {name}
                          {m.userId === currentUserId ? <span className="font-normal text-slate-500"> (you)</span> : null}
                        </div>
                        <div className="text-xs text-slate-500">{m.role === 'ADMIN' ? 'Admin' : 'Member'}</div>
                      </div>
                    </div>
                  </td>
                  {PROJECT_FEATURES.map((f) => (
                    <td className="px-3 py-2 text-center" key={f}>
                      {m.role === 'ADMIN' ? (
                        <span className="text-xs text-slate-500">Always</span>
                      ) : (
                        <Checkbox
                          aria-label={`${PROJECT_FEATURE_INFO[f].label} for ${name}`}
                          checked={m.permissions?.[f] ?? false}
                          disabled={!isAdmin || busy === `${m.userId}:${f}`}
                          onChange={(e) => void toggle(m, f, e.target.checked)}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
