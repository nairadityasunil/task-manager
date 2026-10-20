/**
 * Illustrative product mock-ups for the public pages. They are drawn with JSX + Tailwind (no images) and show
 * sample data only. Each top-level mock is exposed to assistive tech as a single image with a description.
 */
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  BrainCircuit,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Filter,
  Folder,
  History,
  KanbanSquare,
  LayoutList,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plug,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
  Zap
} from 'lucide-react';

import { cn } from '@/components/ui';

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'dark';

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-50 text-slate-600 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  dark: 'bg-slate-900 text-white ring-slate-900'
};

export function Pill({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }): JSX.Element {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONE[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export const PRIORITY_TONE: Record<string, Tone> = { Low: 'neutral', Medium: 'info', High: 'warning', Critical: 'danger' };
export const SLA_TONE: Record<string, Tone> = { Healthy: 'success', 'Near breach': 'warning', Breached: 'danger', Paused: 'neutral', Completed: 'info' };

const AVATAR_COLORS = ['bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-rose-100 text-rose-700', 'bg-slate-200 text-slate-700'];

export function Avatar({ initials, i = 0, className }: { initials: string; i?: number; className?: string }): JSX.Element {
  return (
    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ring-2 ring-white', AVATAR_COLORS[i % AVATAR_COLORS.length], className)}>
      {initials}
    </span>
  );
}

/** Browser-style frame around a mock-up. */
export function MockWindow({
  label,
  url,
  children,
  className,
  bodyClassName
}: {
  label: string;
  url?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}): JSX.Element {
  return (
    <div
      aria-label={label}
      className={cn('min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.18)]', className)}
      role="img"
    >
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div aria-hidden className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        {url ? (
          <div className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-white px-2 py-0.5 text-center font-mono text-[11px] text-slate-500">{url}</div>
        ) : null}
      </div>
      <div className={cn('min-w-0', bodyClassName)}>{children}</div>
    </div>
  );
}

/** A plain card frame (no browser chrome) for smaller mock-ups. */
export function MockCard({ label, children, className }: { label: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <div aria-label={label} className={cn('min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)} role="img">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const HERO_TASKS = [
  { title: 'Draft welcome email sequence', status: 'In progress', priority: 'High', sla: 'Near breach', who: 'AL' },
  { title: 'Fix sign-up form validation', status: 'In review', priority: 'Critical', sla: 'Healthy', who: 'MK' },
  { title: 'Set up product tour for new users', status: 'To do', priority: 'Medium', sla: 'Healthy', who: 'JS' },
  { title: 'Migrate billing webhooks', status: 'Blocked', priority: 'High', sla: 'Paused', who: 'RT' },
  { title: 'Write onboarding checklist copy', status: 'Done', priority: 'Low', sla: 'Completed', who: 'AL' }
];

function SidebarItem({ icon: Icon, label, active }: { icon: typeof Folder; label: string; active?: boolean }): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px]', active ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600')}>
      <Icon className={active ? 'text-slate-700' : 'text-slate-400'} size={13} />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function HeroMock(): JSX.Element {
  return (
    <div className="relative">
      <MockWindow
        label="Illustration of the Pristine app: a project called Apollo with an Onboarding epic, SLA statistics and a list of tasks with priority and SLA health."
        url="app · Apollo / Onboarding"
      >
        <div className="flex min-h-[340px]">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 flex-col gap-3 border-r border-slate-200 bg-white p-2.5 md:flex">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-[12px] font-medium text-slate-800">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-600 text-[11px] text-white">A</span>
              Acme team
              <ChevronDown className="ml-auto text-slate-400" size={12} />
            </div>
            <div className="grid gap-0.5">
              <p className="m-0 px-2 text-[11px] font-medium text-slate-500">Workspace</p>
              <SidebarItem active icon={Folder} label="All Projects" />
              <SidebarItem icon={Plus} label="New Project" />
            </div>
            <div className="grid gap-0.5">
              <p className="m-0 px-2 text-[11px] font-medium text-slate-500">AI</p>
              <SidebarItem icon={BrainCircuit} label="Intelligence" />
              <SidebarItem icon={Sparkles} label="Prompt Library" />
              <SidebarItem icon={Play} label="Prompt Playground" />
            </div>
            <div className="grid gap-0.5">
              <p className="m-0 px-2 text-[11px] font-medium text-slate-500">Product</p>
              <SidebarItem icon={Plug} label="SDK Integrations" />
            </div>
            <div className="mt-auto grid gap-0.5">
              <SidebarItem icon={BookOpen} label="SDK Docs" />
              <SidebarItem icon={Settings} label="Settings" />
            </div>
          </div>

          {/* Main */}
          <div className="min-w-0 flex-1 bg-slate-50">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                Apollo <ChevronDown className="text-slate-400" size={14} />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="hidden items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 sm:flex">
                  <Users size={12} /> Team
                </span>
                <span className="hidden items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 sm:flex">
                  <MessageCircle size={12} /> Chat
                </span>
                <span className="flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white">
                  <Zap size={12} /> AI Planner
                </span>
              </div>
            </div>

            <div className="grid gap-3 p-3 sm:p-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-900">Onboarding</span>
                    <Pill tone="success" dot>Active</Pill>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <LayoutList size={12} /> List
                    <span className="mx-1 text-slate-300">/</span>
                    <KanbanSquare size={12} /> Board
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['Breached', '1', 'text-red-600'],
                    ['Response', '92%', 'text-slate-900'],
                    ['Resolution', '88%', 'text-slate-900'],
                    ['Avg resolve', '2.4d', 'text-slate-900']
                  ].map(([k, v, c]) => (
                    <div className="rounded-md bg-slate-50 px-2 py-1.5" key={k}>
                      <div className="text-[11px] text-slate-500">{k}</div>
                      <div className={cn('text-[13px] font-semibold tabular-nums', c)}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {HERO_TASKS.map((t, i) => (
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0" key={t.title}>
                    {t.status === 'Done' ? (
                      <CheckCircle2 className="shrink-0 text-emerald-600" size={14} />
                    ) : (
                      <Circle className="shrink-0 text-slate-300" size={14} />
                    )}
                    <span className={cn('min-w-0 flex-1 truncate text-[12px]', t.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-800')}>{t.title}</span>
                    <span className="hidden text-[11px] text-slate-500 lg:inline">{t.status}</span>
                    <Pill className="hidden sm:inline-flex" tone={PRIORITY_TONE[t.priority]}>{t.priority}</Pill>
                    <Pill dot tone={SLA_TONE[t.sla]}>{t.sla}</Pill>
                    <Avatar i={i} initials={t.who} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MockWindow>

      {/* Floating guide preview */}
      <div
        aria-label="Illustration of an in-app product tour step shown to users of your app."
        className="absolute -bottom-10 right-3 hidden w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:block lg:-right-10 xl:-right-16"
        role="img"
      >
        <div className="flex items-center justify-between">
          <Pill tone="success" dot>Product tour · Live</Pill>
          <span className="text-[11px] text-slate-500">Step 2 of 4</span>
        </div>
        <p className="m-0 mt-2 text-[13px] font-semibold text-slate-900">Create your first project</p>
        <p className="m-0 mt-1 text-[12px] leading-snug text-slate-600">Projects keep your work organised. Click here to start one.</p>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span className={cn('h-1.5 w-4 rounded-full', i <= 1 ? 'bg-emerald-500' : 'bg-slate-200')} key={i} />
            ))}
          </div>
          <span className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white">Next</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Work management                                                     */
/* ------------------------------------------------------------------ */

const BOARD = [
  { col: 'To do', tasks: [{ t: 'Pricing page copy', p: 'Medium', who: 'JS' }, { t: 'Empty state designs', p: 'Low', who: 'MK' }] },
  { col: 'In progress', tasks: [{ t: 'Invite flow', p: 'High', who: 'AL' }, { t: 'Search indexing', p: 'Medium', who: 'RT' }] },
  { col: 'In review', tasks: [{ t: 'Password reset email', p: 'Critical', who: 'MK' }] },
  { col: 'Done', tasks: [{ t: 'Logo refresh', p: 'Low', who: 'JS' }] }
];

export function TaskViewsMock(): JSX.Element {
  return (
    <MockWindow
      label="Illustration of a kanban board with To do, In progress, In review and Done columns, plus a task inspector showing subtasks and comments."
      url="app · Apollo / Website relaunch"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-500">
          <Search size={12} /> Search tasks
        </div>
        <span className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white">Assigned to me</span>
        <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
          <Filter size={11} /> Priority: High+
        </span>
        <div className="ml-auto flex overflow-hidden rounded-md border border-slate-200 text-[11px]">
          <span className="flex items-center gap-1 px-2 py-1 text-slate-500"><LayoutList size={11} /> List</span>
          <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 font-medium text-slate-900"><KanbanSquare size={11} /> Board</span>
        </div>
      </div>
      <div className="relative bg-slate-50 p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {BOARD.map((c) => (
            <div className="min-w-0 rounded-lg bg-slate-100/70 p-2" key={c.col}>
              <div className="mb-2 flex items-center justify-between px-0.5 text-[11px] font-medium text-slate-600">
                {c.col}
                <span className="text-slate-400">{c.tasks.length}</span>
              </div>
              <div className="grid gap-1.5">
                {c.tasks.map((t, i) => (
                  <div className="rounded-md border border-slate-200 bg-white p-2 shadow-sm" key={t.t}>
                    <div className="truncate text-[12px] font-medium text-slate-800">{t.t}</div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <Pill tone={PRIORITY_TONE[t.p]}>{t.p}</Pill>
                      <Avatar className="h-5 w-5" i={i + c.col.length} initials={t.who} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MockWindow>
  );
}

export function InspectorMock(): JSX.Element {
  return (
    <MockCard
      className="shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]"
      label="Illustration of the task inspector drawer: properties, a subtask checklist with progress, an approval request and live comments."
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500">Task · Website relaunch</div>
          <div className="truncate text-[14px] font-semibold text-slate-900">Password reset email</div>
        </div>
        <X className="shrink-0 text-slate-400" size={16} />
      </div>
      <div className="grid gap-4 p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          {[
            ['Status', <Pill key="s" tone="info">In review</Pill>],
            ['Priority', <Pill key="p" tone="danger">Critical</Pill>],
            ['Assignee', <span className="flex items-center gap-1.5 text-slate-800" key="a"><Avatar i={1} initials="MK" className="h-5 w-5" /> Mia K.</span>],
            ['SLA', <Pill dot key="sla" tone="warning">Near breach</Pill>]
          ].map(([k, v]) => (
            <div className="flex min-w-0 items-center justify-between gap-2" key={k as string}>
              <span className="text-slate-500">{k}</span>
              {v}
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between text-[12px] font-medium text-slate-700">
            Subtasks <span className="text-slate-500">2 / 3</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 grid gap-1.5 text-[12px]">
            {[
              ['Write copy', true],
              ['Add one-time code template', true],
              ['Test on mobile clients', false]
            ].map(([t, done]) => (
              <div className="flex items-center gap-2" key={t as string}>
                <span className={cn('flex h-4 w-4 items-center justify-center rounded border', done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300')}>
                  {done ? <Check size={10} strokeWidth={3} /> : null}
                </span>
                <span className={done ? 'text-slate-400 line-through' : 'text-slate-800'}>{t as string}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-amber-800">Approval requested</span>
            <Pill tone="warning">Pending</Pill>
          </div>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white">Approve</span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Reject</span>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="text-[12px] font-medium text-slate-700">Comments</div>
          <div className="flex gap-2">
            <Avatar i={0} initials="AL" />
            <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700">Copy looks good. Can we shorten the subject line?</div>
          </div>
          <div className="flex gap-2">
            <Avatar i={1} initials="MK" />
            <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700">Done, pushed an update.</div>
          </div>
        </div>
      </div>
    </MockCard>
  );
}

export function SlaMock(): JSX.Element {
  const rows = [
    { t: 'Checkout error on Safari', p: 'Critical', from: 'High', sla: 'Breached', note: 'Resolution overdue 3h' },
    { t: 'Export to CSV times out', p: 'High', from: 'Medium', sla: 'Near breach', note: 'Response due in 40m' },
    { t: 'Typo on settings page', p: 'Low', from: 'Low', sla: 'Healthy', note: 'Due Friday' },
    { t: 'Waiting on vendor API key', p: 'Medium', from: 'Medium', sla: 'Paused', note: 'Blocked' }
  ];
  return (
    <MockCard label="Illustration of SLA health: an epic header with breached count, response and resolution percentages, and tasks whose priority was raised automatically.">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="text-[13px] font-semibold text-slate-900">Support backlog</div>
        <span className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
          <Calculator size={12} /> Recalculate priorities
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
        {[
          ['Breached', '1', 'text-red-600'],
          ['Response met', '94%', 'text-emerald-700'],
          ['Resolution met', '86%', 'text-slate-900'],
          ['Avg resolve time', '1.8d', 'text-slate-900']
        ].map(([k, v, c]) => (
          <div className="bg-white px-4 py-2.5" key={k}>
            <div className="text-[11px] text-slate-500">{k}</div>
            <div className={cn('text-[15px] font-semibold tabular-nums', c)}>{v}</div>
          </div>
        ))}
      </div>
      <div>
        {rows.map((r) => (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 last:border-b-0 sm:flex-nowrap" key={r.t}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-slate-800">{r.t}</div>
              <div className="text-[11px] text-slate-500">{r.note}</div>
            </div>
            {r.from !== r.p ? (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="line-through">{r.from}</span>
                <Zap className="text-amber-500" size={11} />
              </span>
            ) : null}
            <Pill tone={PRIORITY_TONE[r.p]}>{r.p}</Pill>
            <Pill dot tone={SLA_TONE[r.sla]}>{r.sla}</Pill>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function RolloverMock(): JSX.Element {
  return (
    <MockCard className="p-4" label="Illustration of daily rollover: two unfinished tasks from yesterday moved to today automatically.">
      <div className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
        <History className="text-slate-400" size={14} /> Daily rollover
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="grid gap-1.5 rounded-lg border border-dashed border-slate-300 p-2">
          <div className="text-[11px] text-slate-500">Yesterday</div>
          <div className="truncate rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">Review PR #412</div>
          <div className="truncate rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">QA invite flow</div>
        </div>
        <span className="text-slate-400">→</span>
        <div className="grid gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2">
          <div className="text-[11px] font-medium text-emerald-700">Today</div>
          <div className="truncate rounded-md bg-white px-2 py-1 text-[11px] text-slate-800 shadow-sm">Review PR #412</div>
          <div className="truncate rounded-md bg-white px-2 py-1 text-[11px] text-slate-800 shadow-sm">QA invite flow</div>
        </div>
      </div>
    </MockCard>
  );
}

export function ChatMock(): JSX.Element {
  return (
    <MockCard label="Illustration of the project chat panel with live messages between team members.">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <MessageCircle className="text-slate-400" size={14} /> Apollo chat
        </span>
        <Pill tone="success" dot>Live</Pill>
      </div>
      <div className="grid gap-2.5 p-4">
        {[
          { who: 'RT', name: 'Raj', text: 'Vendor sent the API key, unblocking the webhook task now.', i: 3 },
          { who: 'AL', name: 'Ana', text: 'Nice. I will move it back to In progress.', i: 0 },
          { who: 'MK', name: 'Mia', text: 'Approval on the reset email is waiting for you, Ana.', i: 1 }
        ].map((m) => (
          <div className="flex gap-2" key={m.text}>
            <Avatar i={m.i} initials={m.who} />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-700">{m.name}</div>
              <div className="text-[12px] text-slate-600">{m.text}</div>
            </div>
          </div>
        ))}
        <div className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-400">Message the team…</div>
      </div>
    </MockCard>
  );
}

/* ------------------------------------------------------------------ */
/* AI                                                                  */
/* ------------------------------------------------------------------ */

export function PlannerMock(): JSX.Element {
  return (
    <MockCard label="Illustration of the AI Planner: a plain-language project description on the left and a proposed plan of epics and tasks on the right.">
      <div className="grid md:grid-cols-[1fr_1.2fr]">
        <div className="grid content-start gap-2.5 border-b border-slate-200 p-4 md:border-b-0 md:border-r">
          <div className="text-[12px] font-medium text-slate-700">Planner chat</div>
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] text-white">
            We are launching a customer portal: sign-up, billing and a help centre. Six weeks, three people.
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
            Here is a plan with 3 epics and 14 tasks. Want me to split billing into a separate milestone?
          </div>
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] text-white">Yes, and add a QA task to each epic.</div>
        </div>
        <div className="grid content-start gap-2 p-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-slate-700">
            Proposed plan <Pill tone="info">Draft</Pill>
          </div>
          {[
            ['Accounts and sign-up', ['Sign-up form', 'Email verification', 'QA: sign-up']],
            ['Billing', ['Plans and checkout', 'Invoices', 'QA: billing']],
            ['Help centre', ['Article layout', 'Search', 'QA: help centre']]
          ].map(([epic, tasks]) => (
            <div className="rounded-lg border border-slate-200 p-2.5" key={epic as string}>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-900">
                <Folder className="text-slate-400" size={12} /> {epic as string}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(tasks as string[]).map((t) => (
                  <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200" key={t}>{t}</span>
                ))}
              </div>
            </div>
          ))}
          <span className="mt-1 w-fit rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white">Approve and create project</span>
        </div>
      </div>
    </MockCard>
  );
}

export function BreakdownMock(): JSX.Element {
  return (
    <MockCard label="Illustration of AI task breakdown: one task split into five suggested subtasks.">
      <div className="border-b border-slate-200 p-4">
        <div className="text-[11px] text-slate-500">Decompose task with AI</div>
        <div className="mt-1 text-[14px] font-semibold text-slate-900">Add two-factor sign-in</div>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
          Emailed 6-digit code after password, with resend and expiry.
        </div>
      </div>
      <div className="grid gap-1.5 p-4">
        {['Generate and hash one-time codes', 'Send code email template', 'Code entry screen with resend', 'Expire codes and limit attempts', 'Tests for the 2FA flow'].map((t, i) => (
          <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-800" key={t}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">{i + 1}</span>
            <span className="truncate">{t}</span>
          </div>
        ))}
        <span className="mt-1 w-fit rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">Apply breakdown to task</span>
      </div>
    </MockCard>
  );
}

export function DailyPlanMock(): JSX.Element {
  return (
    <MockCard label="Illustration of the AI daily planner: today's focus summary and a schedule built from your tasks and constraints.">
      <div className="border-b border-slate-200 p-4">
        <div className="text-[12px] font-medium text-slate-700">Constraints</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {['6 focus hours', 'Meetings 2–3pm', 'Finish critical first'].map((c) => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>
      </div>
      <div className="grid gap-2 p-4">
        <div className="rounded-lg bg-emerald-50 p-2.5 text-[12px] text-emerald-900 ring-1 ring-inset ring-emerald-200">
          <span className="font-medium">Today&apos;s focus summary:</span> close the breached checkout bug, then review two PRs.
        </div>
        {[
          ['9:00', 'Checkout error on Safari', 'Critical'],
          ['11:00', 'Review PR #412', 'High'],
          ['13:00', 'Export to CSV times out', 'High'],
          ['15:30', 'Pricing page copy', 'Medium']
        ].map(([time, t, p]) => (
          <div className="flex items-center gap-3 text-[12px]" key={t}>
            <span className="w-10 shrink-0 tabular-nums text-slate-500">{time}</span>
            <span className="min-w-0 flex-1 truncate rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-800">{t}</span>
            <Pill tone={PRIORITY_TONE[p]}>{p}</Pill>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function ModelsMock(): JSX.Element {
  return (
    <MockCard label="Illustration of per-project AI settings: choose Google Gemini, OpenAI, Anthropic Claude, or Groq and local models; without a provider the project uses built-in rules.">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <Bot className="text-slate-400" size={14} /> AI settings · Apollo
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <span className="relative h-4 w-7 rounded-full bg-emerald-600">
            <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" />
          </span>
          Custom AI planner
        </span>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {[
          ['Google Gemini', false],
          ['OpenAI', false],
          ['Anthropic Claude', true],
          ['Groq / local', false]
        ].map(([name, on]) => (
          <div
            className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5 text-[12px]', on ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200')}
            key={name as string}
          >
            <span className="font-medium text-slate-800">{name as string}</span>
            <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300')}>
              {on ? <Check size={10} strokeWidth={3} /> : null}
            </span>
          </div>
        ))}
        <div className="rounded-lg border border-slate-200 px-3 py-2 sm:col-span-2">
          <div className="text-[11px] text-slate-500">API key</div>
          <div className="font-mono text-[12px] text-slate-700">••••••••••••••••••••</div>
        </div>
        <p className="m-0 text-[11px] leading-snug text-slate-500 sm:col-span-2">No provider? The project runs on built-in rules (“AI off”).</p>
      </div>
    </MockCard>
  );
}

export function IntelligenceMock(): JSX.Element {
  const a = [38, 42, 40, 47, 45, 52, 50, 58, 55, 61, 82, 63];
  const b = [30, 31, 35, 33, 36, 38, 37, 40, 43, 42, 45, 47];
  const toPath = (vals: number[]): string =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * 300) / (vals.length - 1)},${100 - v}`).join(' ');
  return (
    <MockCard label="Illustration of the semantic intelligence page: two projects compared over a time range, with an anomaly highlighted.">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <BrainCircuit className="text-slate-400" size={14} /> Tasks completed
        </span>
        <div className="flex overflow-hidden rounded-md border border-slate-200 text-[11px]">
          {['7d', '30d', '90d'].map((r) => (
            <span className={cn('px-2 py-0.5', r === '90d' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500')} key={r}>{r}</span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <svg aria-hidden className="h-32 w-full" preserveAspectRatio="none" viewBox="0 0 300 100">
          {[25, 50, 75].map((y) => (
            <line key={y} stroke="#e2e8f0" strokeDasharray="3 3" x1="0" x2="300" y1={y} y2={y} />
          ))}
          <path d={toPath(b)} fill="none" stroke="#94a3b8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={toPath(a)} fill="none" stroke="#059669" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <circle cx={(10 * 300) / 11} cy={100 - 82} fill="#f59e0b" r="4" />
        </svg>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-emerald-600" /> Apollo</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-slate-400" /> Gemini</span>
          <span className="ml-auto flex items-center gap-1 text-amber-700"><AlertTriangle size={12} /> Anomaly · week 11</span>
        </div>
      </div>
    </MockCard>
  );
}

export function PlaygroundMock(): JSX.Element {
  return (
    <MockCard label="Illustration of the prompt playground: a prompt template with variables and model parameters, versions, and a canary deployment sending 10% of traffic to the new version.">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <Sparkles className="text-slate-400" size={14} /> release-notes-writer
        </span>
        <div className="flex items-center gap-1.5">
          <Pill>v3</Pill>
          <span className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white">Deploy</span>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
          Summarise these changes for <span className="text-emerald-300">{'{{audience}}'}</span> in a{' '}
          <span className="text-emerald-300">{'{{tone}}'}</span> tone:
          <br />
          <span className="text-emerald-300">{'{{changes}}'}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {[
            ['temperature', '0.4'],
            ['max tokens', '600'],
            ['top p', '1.0']
          ].map(([k, v]) => (
            <div className="rounded-md border border-slate-200 px-2 py-1.5" key={k}>
              <div className="text-slate-500">{k}</div>
              <div className="font-medium tabular-nums text-slate-800">{v}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
          <div className="flex items-center justify-between text-[12px] font-medium text-sky-900">
            Canary rollout · v3 <span className="tabular-nums">10%</span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-sky-200">
            <div className="h-full w-[10%] bg-sky-500" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-sky-800">
            <span>v3 canary</span>
            <span>v2 production 90%</span>
          </div>
        </div>
      </div>
    </MockCard>
  );
}

/* ------------------------------------------------------------------ */
/* Product engagement                                                  */
/* ------------------------------------------------------------------ */

export function SetupMock(): JSX.Element {
  const steps = [
    ['Install the SDK', true],
    ['Initialise it with your SDK key', true],
    ['Open your app to connect', true],
    ['Track your first event', false],
    ['Publish your first guide or survey', false]
  ] as const;
  return (
    <MockCard label="Illustration of an SDK integration's guided setup: three of five steps done, status Connected.">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-slate-900">Acme Web</div>
          <div className="text-[11px] text-slate-500">Production · app.acme.test</div>
        </div>
        <Pill dot tone="success">Connected</Pill>
      </div>
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-[12px] text-slate-600">
          <span className="font-medium text-slate-800">Guided setup</span>
          3 of 5 steps done
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-3/5 rounded-full bg-emerald-600" />
        </div>
      </div>
      <ol className="m-0 grid list-none gap-0 p-0 py-2">
        {steps.map(([t, done], i) => (
          <li className="flex items-center gap-3 px-4 py-1.5 text-[12px]" key={t}>
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
                done ? 'bg-emerald-600 text-white' : i === 3 ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-500'
              )}
            >
              {done ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className={done ? 'text-slate-500' : 'font-medium text-slate-900'}>{t}</span>
          </li>
        ))}
      </ol>
    </MockCard>
  );
}

/** Tiny illustrations of the five guide formats. */
export function GuideFormatIllustration({ format }: { format: 'modal' | 'tour' | 'tip' | 'hotspot' | 'banner' }): JSX.Element {
  return (
    <div aria-hidden className="relative h-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {/* fake app chrome */}
      <div className="flex h-4 items-center gap-1 border-b border-slate-200 bg-white px-2">
        <span className="h-1.5 w-6 rounded bg-slate-200" />
        <span className="h-1.5 w-4 rounded bg-slate-200" />
        <span className="ml-auto h-1.5 w-3 rounded bg-slate-200" />
      </div>
      <div className="grid gap-1.5 p-2">
        <span className="h-2 w-2/3 rounded bg-slate-200" />
        <span className="h-2 w-1/2 rounded bg-slate-200" />
        <span className="h-6 w-full rounded bg-slate-100 ring-1 ring-inset ring-slate-200" />
      </div>
      {format === 'modal' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/25">
          <div className="w-24 rounded-md bg-white p-2 shadow-md">
            <span className="block h-1.5 w-14 rounded bg-slate-800" />
            <span className="mt-1 block h-1 w-20 rounded bg-slate-300" />
            <span className="mt-1 block h-1 w-16 rounded bg-slate-300" />
            <span className="mt-1.5 block h-2.5 w-9 rounded bg-emerald-600" />
          </div>
        </div>
      ) : null}
      {format === 'tour' ? (
        <>
          <span className="absolute left-2 top-[34px] h-3 w-[44%] rounded ring-2 ring-emerald-500" />
          <div className="absolute left-6 top-[54px] w-24 rounded-md bg-slate-900 p-1.5 shadow-md">
            <span className="absolute -top-1 left-3 h-2 w-2 rotate-45 bg-slate-900" />
            <span className="block h-1 w-14 rounded bg-white/80" />
            <span className="mt-1 block h-1 w-10 rounded bg-white/40" />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] leading-none text-white/70">2/4</span>
              <span className="h-2 w-6 rounded bg-emerald-500" />
            </div>
          </div>
        </>
      ) : null}
      {format === 'tip' ? (
        <div className="absolute bottom-2 right-2 w-24 rounded-md border border-slate-200 bg-white p-1.5 shadow-md">
          <span className="flex items-center gap-1">
            <Sparkles className="text-amber-500" size={10} />
            <span className="block h-1 w-12 rounded bg-slate-700" />
          </span>
          <span className="mt-1 block h-1 w-20 rounded bg-slate-300" />
        </div>
      ) : null}
      {format === 'hotspot' ? (
        <span className="absolute left-[58%] top-[44px] flex h-4 w-4 items-center justify-center">
          <span className="absolute h-4 w-4 rounded-full bg-emerald-500/30" />
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : null}
      {format === 'banner' ? (
        <div className="absolute inset-x-0 top-4 flex items-center gap-1.5 bg-slate-900 px-2 py-1">
          <span className="h-1 w-16 rounded bg-white/80" />
          <span className="ml-auto h-2 w-6 rounded bg-emerald-500" />
        </div>
      ) : null}
    </div>
  );
}

export function NpsMock(): JSX.Element {
  return (
    <MockCard className="p-4" label="Illustration of an NPS survey question asking how likely you are to recommend the product, on a 0 to 10 scale.">
      <div className="flex items-center justify-between">
        <Pill tone="info">NPS</Pill>
        <X className="text-slate-400" size={14} />
      </div>
      <p className="m-0 mt-2 text-[13px] font-semibold text-slate-900">How likely are you to recommend Acme to a friend?</p>
      <div className="mt-3 grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <span
            className={cn(
              'flex h-7 items-center justify-center rounded-md border text-[11px] font-medium tabular-nums',
              i === 9 ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'
            )}
            key={i}
          >
            {i}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </MockCard>
  );
}

export function NpsResultsMock(): JSX.Element {
  return (
    <MockCard className="p-4" label="Illustration of NPS results split into promoters, passives and detractors.">
      <div className="text-[12px] font-medium text-slate-700">Responses · per question</div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full">
        <span className="w-[56%] bg-emerald-500" />
        <span className="w-[28%] bg-slate-300" />
        <span className="w-[16%] bg-red-400" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Promoters</span>
        <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-slate-300" /> Passives</span>
        <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-red-400" /> Detractors</span>
      </div>
    </MockCard>
  );
}

export function ChecklistMock(): JSX.Element {
  return (
    <MockCard className="p-4" label="Illustration of an onboarding checklist shown inside your app, two of four items done.">
      <div className="flex items-center justify-between text-[13px] font-semibold text-slate-900">
        Get started with Acme <span className="text-[11px] font-medium text-slate-500">2 / 4</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 rounded-full bg-emerald-500" />
      </div>
      <div className="mt-3 grid gap-1.5">
        {[
          ['Create your account', true],
          ['Invite a teammate', true],
          ['Create your first project', false],
          ['Connect an integration', false]
        ].map(([t, done]) => (
          <div className="flex items-center gap-2 text-[12px]" key={t as string}>
            {done ? <CheckCircle2 className="text-emerald-600" size={14} /> : <Circle className="text-slate-300" size={14} />}
            <span className={done ? 'text-slate-400 line-through' : 'text-slate-800'}>{t as string}</span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function SegmentMock(): JSX.Element {
  return (
    <MockCard className="p-4" label="Illustration of a saved segment built from rules on page URL, a user attribute and an event.">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Admins on the Pro plan</span>
        <Pill>Saved segment</Pill>
      </div>
      <div className="mt-3 grid gap-1.5 text-[12px]">
        {[
          ['Page URL', 'contains', '/settings'],
          ['User · plan', 'equals', 'pro'],
          ['Event', 'performed', 'invite_sent']
        ].map(([a, op, v], i) => (
          <div className="flex flex-wrap items-center gap-1.5" key={a}>
            <span className="w-8 text-[11px] text-slate-500">{i === 0 ? 'Where' : 'and'}</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-slate-700">{a}</span>
            <span className="text-slate-500">{op}</span>
            <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-800">{v}</span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

export function LifecycleMock(): JSX.Element {
  const states: Array<[string, Tone]> = [
    ['Draft', 'neutral'],
    ['Live', 'success'],
    ['Paused', 'warning'],
    ['Archived', 'dark']
  ];
  return (
    <div aria-label="Lifecycle of a guide or survey: Draft, then Live after a publish confirmation, then Paused, then Archived." className="flex flex-wrap items-center gap-1.5" role="img">
      {states.map(([s, tone], i) => (
        <span className="flex items-center gap-1.5" key={s}>
          <Pill dot tone={tone}>{s}</Pill>
          {i < states.length - 1 ? <span className="text-slate-300">→</span> : null}
        </span>
      ))}
    </div>
  );
}

export function FunnelMock(): JSX.Element {
  const steps = [
    ['Step 1 · Welcome', 100],
    ['Step 2 · Create project', 78],
    ['Step 3 · Invite team', 61],
    ['Step 4 · Done', 54]
  ] as const;
  return (
    <MockCard className="p-4" label="Illustration of guide analytics: views, completions and dismissals, plus a step drop-off chart.">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Views', '1,240'],
          ['Completions', '672'],
          ['Dismissals', '205']
        ].map(([k, v]) => (
          <div className="rounded-lg bg-slate-50 px-2.5 py-2" key={k}>
            <div className="text-[11px] text-slate-500">{k}</div>
            <div className="text-[14px] font-semibold tabular-nums text-slate-900">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[12px] font-medium text-slate-700">Step drop-off</div>
      <div className="mt-2 grid gap-1.5">
        {steps.map(([label, pct]) => (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[11px]" key={label}>
            <div className="relative h-5 overflow-hidden rounded bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded bg-emerald-500/80" style={{ width: `${pct}%` }} />
              <span className="relative z-10 block truncate px-2 leading-5 text-slate-900">{label}</span>
            </div>
            <span className="w-9 text-right tabular-nums text-slate-600">{pct}%</span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

/* ------------------------------------------------------------------ */
/* Event tracking                                                      */
/* ------------------------------------------------------------------ */

export function EventsMock(): JSX.Element {
  const events = [
    ['project_created', 'u_8f21', '2m ago'],
    ['invite_sent', 'u_19ac', '5m ago'],
    ['checkout_completed', 'u_77d0', '12m ago'],
    ['project_created', 'u_44be', '18m ago']
  ];
  return (
    <MockWindow
      label="Illustration of the event tracking page: a filterable list of events sent with Engagement.track and a payload viewer for the selected event."
      url="app · Acme Web / Events"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
          <Activity size={11} /> All events <ChevronDown size={11} />
        </span>
        <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
          <Clock size={11} /> Last 24 hours <ChevronDown size={11} />
        </span>
      </div>
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="border-b border-slate-200 md:border-b-0 md:border-r">
          {events.map(([name, user, when], i) => (
            <div
              className={cn('flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[12px] last:border-b-0', i === 2 && 'bg-slate-50')}
              key={`${name}-${user}`}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', i === 2 ? 'bg-emerald-500' : 'bg-slate-300')} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-800">{name}</span>
              <span className="hidden font-mono text-[11px] text-slate-500 sm:inline">{user}</span>
              <span className="shrink-0 text-[11px] text-slate-500">{when}</span>
            </div>
          ))}
        </div>
        <div className="p-3">
          <div className="text-[11px] font-medium text-slate-500">Payload</div>
          <pre className="m-0 mt-1.5 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
            {`{
  "event": "checkout_completed",
  "userId": "u_77d0",
  "properties": {
    "plan": "pro",
    "amount": 199
  }
}`}
          </pre>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Developers                                                          */
/* ------------------------------------------------------------------ */

export function McpMock(): JSX.Element {
  return (
    <div
      aria-label="Illustration of an MCP client connected to Pristine, showing tool domains such as tasks, projects, SLA, priority, analytics and intelligence."
      className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900"
      role="img"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-[12px] font-medium text-slate-200">MCP client · Pristine</span>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Connected
        </span>
      </div>
      <div className="grid gap-1 p-3 font-mono text-[11px]">
        {['Tasks', 'Projects', 'SLA', 'Priority', 'Analytics', 'Intelligence'].map((t) => (
          <div className="flex items-center justify-between rounded-md px-2 py-1 font-sans text-slate-300 odd:bg-white/5" key={t}>
            {t}
            <MoreHorizontal className="text-slate-600" size={12} />
          </div>
        ))}
        <div className="mt-1 rounded-md bg-slate-950 px-2 py-1.5 text-emerald-300">POST /tools/task:search</div>
        <div className="px-2 pt-1 font-sans text-[11px] text-slate-400">Tool domains exposed to MCP clients</div>
      </div>
    </div>
  );
}
