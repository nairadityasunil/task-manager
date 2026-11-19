import { Bot, Clock, Info, Pencil, Sparkles, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Badge, Button, Checkbox, Tabs, avatarColor, initialsOf } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { updateMemberPermissions } from '@/services/projects';
import { ProjectSlaPanel } from './ProjectSlaPanel';
import { PROJECT_FEATURES, PROJECT_FEATURE_INFO, type Project, type ProjectFeature, type ProjectMember, type ProjectPermissions } from '@/types/project';
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

const FEATURE_ICON: Record<ProjectFeature, typeof Users> = { team: Users, time: Clock, prompts: Sparkles, aiPlanner: Bot };

const day = (v?: string): string => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown');

/** Everything about one project in one place: details, team, who may use which feature, and workflow states. */
export function ProjectSettings({ project, members, currentUserId, isAdmin, myPermissions, onEditDetails, onChanged, teamPanel, workflowPanel, onOpenAiSettings }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('general');
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
              {isAdmin || myPermissions.aiPlanner ? (
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
