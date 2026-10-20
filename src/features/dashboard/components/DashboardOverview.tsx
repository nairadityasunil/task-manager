import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  ListTodo,
  CircleDashed,
  Plus,
  Sparkles,
  Zap
} from 'lucide-react';

import Skeleton from '@/components/Skeleton';
import UserAvatar from '@/components/UserAvatar';
import { Badge, Button, Card, CardHeader, IconTile, StatCard, cn, type BadgeTone } from '@/components/ui';
import type { Epic } from '@/types/epic';
import type { Project } from '@/types/project';
import type { Task, TaskPriority, TaskStatus } from '@/types/task';

interface DashboardOverviewProps {
  user: { id?: string; name?: string | null; email?: string | null } | null;
  tasks: Task[];
  projects: Project[];
  epics: Epic[];
  loading: boolean;
  onNewProject: () => void;
  onOpenAiPlanner: () => void;
  onOpenTask: (task: Task) => void;
  /** The projects section, rendered below the overview. */
  children?: ReactNode;
}

const STATUS_META: Array<{ key: TaskStatus | 'IN_REVIEW'; label: string; bar: string; dot: string }> = [
  { key: 'BACKLOG', label: 'Backlog', bar: 'bg-slate-300', dot: 'bg-slate-300' },
  { key: 'TODO', label: 'To do', bar: 'bg-sky-400', dot: 'bg-sky-400' },
  { key: 'IN_PROGRESS', label: 'In progress', bar: 'bg-violet-400', dot: 'bg-violet-400' },
  { key: 'IN_REVIEW', label: 'In review', bar: 'bg-amber-400', dot: 'bg-amber-400' },
  { key: 'BLOCKED', label: 'Blocked', bar: 'bg-rose-400', dot: 'bg-rose-400' },
  { key: 'DONE', label: 'Done', bar: 'bg-emerald-500', dot: 'bg-emerald-500' }
];

const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'orange',
  CRITICAL: 'danger'
};

const PRIORITY_RANK: Record<TaskPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const label = (value: string): string => {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** rolled_over counts as an open "to do" task. */
const normalisedStatus = (status: TaskStatus): TaskStatus => (status === 'rolled_over' ? 'TODO' : status);

function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatusDot({ status }: { status: TaskStatus }): JSX.Element {
  const meta = STATUS_META.find((m) => m.key === normalisedStatus(status));
  return <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', meta?.dot ?? 'bg-slate-300')} />;
}

export default function DashboardOverview({
  user,
  tasks,
  projects,
  epics,
  loading,
  onNewProject,
  onOpenAiPlanner,
  onOpenTask,
  children
}: DashboardOverviewProps): JSX.Element {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const now = new Date();
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || (user?.email ?? '').split('@')[0] || 'there';

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      const key = normalisedStatus(task.status);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const done = counts.DONE ?? 0;
    const open = tasks.length - done;
    const slaBreached = tasks.filter((t) => normalisedStatus(t.status) !== 'DONE' && (t.currentSlaState === 'BREACHED' || t.resolutionBreached)).length;
    const nearBreach = tasks.filter((t) => normalisedStatus(t.status) !== 'DONE' && t.currentSlaState === 'NEAR_BREACH').length;
    const blocked = tasks.filter((t) => normalisedStatus(t.status) !== 'DONE' && (t.status === 'BLOCKED' || t.isBlocked)).length;
    const priorities: Record<TaskPriority, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const task of tasks) {
      if (normalisedStatus(task.status) === 'DONE') continue;
      const p = (task.dynamicPriority || task.priority) as TaskPriority;
      if (p in priorities) priorities[p] += 1;
    }
    return {
      counts,
      done,
      open,
      blocked,
      slaBreached,
      nearBreach,
      inProgress: (counts.IN_PROGRESS ?? 0) + (counts.IN_REVIEW ?? 0),
      inReview: counts.IN_REVIEW ?? 0,
      percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      priorities
    };
  }, [tasks]);

  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const epicName = useMemo(() => new Map(epics.map((e) => [e.id, e.name])), [epics]);

  const mine = useMemo(() => tasks.filter((t) => user?.id && t.assignedTo?.id === user.id), [tasks, user?.id]);
  const upNext = useMemo(() => {
    const source = scope === 'mine' ? mine : tasks;
    return source
      .filter((t) => normalisedStatus(t.status) !== 'DONE')
      .sort((a, b) => {
        const pa = PRIORITY_RANK[(a.dynamicPriority || a.priority) as TaskPriority] ?? 9;
        const pb = PRIORITY_RANK[(b.dynamicPriority || b.priority) as TaskPriority] ?? 9;
        if (pa !== pb) return pa - pb;
        return (b.dynamicPriorityScore ?? 0) - (a.dynamicPriorityScore ?? 0);
      })
      .slice(0, 7);
  }, [scope, mine, tasks]);

  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now);
  const showSkeleton = loading && tasks.length === 0;

  return (
    <div className="flex min-h-full flex-col">
      {/* Greeting */}
      <div className="header-band border-b border-slate-200 px-3 py-4 sm:px-5 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-medium text-emerald-700">{dateLabel}</p>
            <h1 className="m-0 mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {greeting(now)}, {firstName}
            </h1>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">
              {showSkeleton
                ? 'Loading your day…'
                : tasks.length === 0
                ? 'Nothing is planned for today yet.'
                : `${stats.open} open ${stats.open === 1 ? 'task' : 'tasks'} today across ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}.`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button className="flex-1 sm:flex-none" icon={Zap} onClick={onOpenAiPlanner} variant="secondary">
              AI Planner
            </Button>
            <Button className="flex-1 sm:flex-none" icon={Plus} onClick={onNewProject} variant="primary">
              New project
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-3 py-4 sm:gap-4 sm:px-5 lg:px-6">
        {/* KPIs */}
        <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {showSkeleton ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton className="h-[92px] rounded-xl" key={i} />)
          ) : (
            <>
              <StatCard
                hint={stats.inProgress ? `${stats.inProgress} in progress` : 'None started yet'}
                icon={ListTodo}
                label="Open today"
                tone="sky"
                value={stats.open}
              />
              <StatCard
                hint={stats.inReview ? `${stats.inReview} in review` : 'Actively being worked on'}
                icon={CircleDashed}
                label="In progress"
                tone="violet"
                value={stats.inProgress}
              />
              <StatCard
                hint={
                  stats.slaBreached
                    ? `${stats.slaBreached} SLA breached`
                    : stats.nearBreach
                    ? `${stats.nearBreach} near SLA breach`
                    : 'No SLA risk'
                }
                hintTone={stats.slaBreached ? 'danger' : stats.nearBreach ? 'warning' : 'success'}
                icon={AlertTriangle}
                label="Blocked"
                tone="rose"
                value={stats.blocked}
              />
              <StatCard
                hint={tasks.length ? `${stats.percent}% of today's tasks` : 'No tasks today'}
                hintTone={stats.percent >= 50 ? 'success' : 'neutral'}
                icon={CheckCircle2}
                label="Completed"
                tone="emerald"
                value={stats.done}
              />
            </>
          )}
        </section>

        <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Up next */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader
              actions={
                <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Show tasks">
                  {(['mine', 'all'] as const).map((value) => (
                    <button
                      aria-pressed={scope === value}
                      className={cn(
                        'h-7 rounded-md px-2.5 text-xs font-medium transition-colors duration-150',
                        scope === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      )}
                      key={value}
                      onClick={() => setScope(value)}
                      type="button"
                    >
                      {value === 'mine' ? `Mine${mine.length ? ` · ${mine.filter((t) => normalisedStatus(t.status) !== 'DONE').length}` : ''}` : 'Everyone'}
                    </button>
                  ))}
                </div>
              }
              description="Highest priority open work for today"
              icon={<IconTile icon={CircleDot} size="sm" tone="emerald" />}
              title="Up next"
            />
            {showSkeleton ? (
              <div className="grid gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton className="h-10" key={i} />
                ))}
              </div>
            ) : upNext.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <IconTile icon={CheckCircle2} size="lg" tone="emerald" />
                <div className="text-sm font-semibold text-slate-900">
                  {tasks.length === 0 ? 'No tasks planned for today' : 'You are all caught up'}
                </div>
                <p className="m-0 max-w-sm text-[13px] text-slate-500">
                  {tasks.length === 0
                    ? 'Open a project to add tasks, or let the AI planner draft a plan for you.'
                    : scope === 'mine'
                    ? 'Nothing open is assigned to you. Switch to Everyone to see the rest of the team.'
                    : 'Every task for today is done.'}
                </p>
                {tasks.length === 0 ? (
                  <Button className="mt-1" icon={Sparkles} onClick={onOpenAiPlanner} size="sm" variant="secondary">
                    Plan with AI
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                {upNext.map((task) => {
                  const priority = (task.dynamicPriority || task.priority) as TaskPriority;
                  const where = [task.projectId ? projectName.get(task.projectId) : null, task.epicId ? epicName.get(task.epicId) : null]
                    .filter(Boolean)
                    .join(' / ');
                  return (
                    <li key={task.id}>
                      <button
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                        onClick={() => onOpenTask(task)}
                        type="button"
                      >
                        <StatusDot status={task.status} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-900 group-hover:text-emerald-700">{task.title}</span>
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                            <span className="shrink-0">{label(normalisedStatus(task.status))}</span>
                            {where ? (
                              <>
                                <span aria-hidden className="text-slate-300">·</span>
                                <span className="truncate">{where}</span>
                              </>
                            ) : null}
                          </span>
                        </span>
                        {task.currentSlaState === 'BREACHED' || task.currentSlaState === 'NEAR_BREACH' ? (
                          <Badge className="hidden sm:inline-flex" dot tone={task.currentSlaState === 'BREACHED' ? 'danger' : 'warning'}>
                            {task.currentSlaState === 'BREACHED' ? 'SLA breached' : 'Near breach'}
                          </Badge>
                        ) : null}
                        <Badge className="shrink-0" tone={PRIORITY_TONE[priority] ?? 'neutral'}>
                          {label(priority)}
                        </Badge>
                        {task.assignedTo?.email ? (
                          <UserAvatar className="hidden sm:flex" email={task.assignedTo.email} name={task.assignedTo.name} showTooltip={false} size="sm" />
                        ) : null}
                        <ArrowRight className="hidden shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block" size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Progress */}
          <Card className="min-w-0">
            <CardHeader description="Today's tasks by status" title="Progress" />
            <div className="grid gap-4 p-4">
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{stats.percent}%</span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {stats.done} of {tasks.length} done
                  </span>
                </div>
                <div
                  aria-label={`${stats.percent}% of today's tasks done`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={stats.percent}
                  className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                >
                  {tasks.length
                    ? STATUS_META.map((meta) => {
                        const n = stats.counts[meta.key] ?? 0;
                        return n ? (
                          <span className={cn('h-full transition-[width] duration-500', meta.bar)} key={meta.key} style={{ width: `${(n / tasks.length) * 100}%` }} />
                        ) : null;
                      })
                    : null}
                </div>
              </div>
              <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-1.5 p-0">
                {STATUS_META.map((meta) => (
                  <li className="flex items-center justify-between gap-2 text-[13px]" key={meta.key}>
                    <span className="flex min-w-0 items-center gap-2 text-slate-600">
                      <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                      <span className="truncate">{meta.label}</span>
                    </span>
                    <span className="font-medium text-slate-900 tabular-nums">{stats.counts[meta.key] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 pt-3">
                <div className="mb-2 text-xs font-medium text-slate-500">Open by priority</div>
                <div className="grid grid-cols-4 gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map((p) => (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5 text-center" key={p}>
                      <div className="text-base font-semibold text-slate-900 tabular-nums">{stats.priorities[p]}</div>
                      <div className="truncate text-[11px] text-slate-500">{label(p)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {children}
      </div>
    </div>
  );
}
