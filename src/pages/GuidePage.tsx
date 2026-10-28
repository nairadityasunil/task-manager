import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Info,
  Lightbulb,
  Minus,
  type LucideIcon
} from 'lucide-react';

import { cn } from '@/components/ui';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { CodeBlock } from '@/components/marketing/primitives';
import { GUIDE_SECTIONS } from '@/components/marketing/sections';
import { useHashScroll } from '@/components/marketing/useHashScroll';
import { GuideFormatIllustration, LifecycleMock } from '@/components/marketing/Mockups';

/* ------------------------------------------------------------------ */
/* Typography building blocks                                          */
/* ------------------------------------------------------------------ */

/** A UI label as it appears in the app, e.g. a button or a menu path. */
function Ui({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-1.5 py-px text-[13px] font-medium text-slate-800">
      {children}
    </span>
  );
}

function Code({ children }: { children: ReactNode }): JSX.Element {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">{children}</code>;
}

function P({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <p className={cn('m-0 text-[15px] leading-7 text-slate-700', className)}>{children}</p>;
}

function H3({ id, children }: { id?: string; children: ReactNode }): JSX.Element {
  return (
    <h3 className="m-0 mt-4 scroll-mt-32 text-lg font-semibold tracking-tight text-slate-900 lg:scroll-mt-24" id={id}>
      {children}
    </h3>
  );
}

function H4({ children }: { children: ReactNode }): JSX.Element {
  return <h4 className="m-0 mt-2 text-[15px] font-semibold text-slate-900">{children}</h4>;
}

/** Numbered step-by-step instructions. */
function Steps({ items }: { items: ReactNode[] }): JSX.Element {
  return (
    <ol className="m-0 grid list-none gap-3 p-0">
      {items.map((item, i) => (
        <li className="flex gap-3" key={i}>
          <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {i + 1}
          </span>
          <div className="min-w-0 text-[15px] leading-7 text-slate-700">{item}</div>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: ReactNode[] }): JSX.Element {
  return (
    <ul className="m-0 grid list-disc gap-1.5 pl-5 text-[15px] leading-7 text-slate-700 marker:text-slate-400">
      {items.map((item, i) => (
        <li className="pl-1" key={i}>
          {item}
        </li>
      ))}
    </ul>
  );
}

const CALLOUT: Record<'tip' | 'note' | 'warning', { icon: LucideIcon; label: string; cls: string; iconCls: string }> = {
  tip: { icon: Lightbulb, label: 'Tip', cls: 'border-emerald-200 bg-emerald-50/60', iconCls: 'text-emerald-700' },
  note: { icon: Info, label: 'Note', cls: 'border-sky-200 bg-sky-50/60', iconCls: 'text-sky-700' },
  warning: { icon: AlertTriangle, label: 'Important', cls: 'border-amber-200 bg-amber-50/70', iconCls: 'text-amber-700' }
};

function Callout({ tone = 'tip', title, children }: { tone?: 'tip' | 'note' | 'warning'; title?: string; children: ReactNode }): JSX.Element {
  const c = CALLOUT[tone];
  return (
    <aside aria-label={title ?? c.label} className={cn('flex gap-3 rounded-xl border p-4', c.cls)}>
      <c.icon aria-hidden className={cn('mt-0.5 shrink-0', c.iconCls)} size={18} />
      <div className="min-w-0 text-sm leading-6 text-slate-700">
        <p className="m-0 font-semibold text-slate-900">{title ?? c.label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </aside>
  );
}

/** Two-column definition grid (term + description), used for states, formats and types. */
function DefinitionGrid({ items }: { items: Array<[ReactNode, ReactNode]> }): JSX.Element {
  return (
    <dl className="m-0 grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {items.map(([term, desc], i) => (
        <div className="grid gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4" key={i}>
          <dt className="text-sm font-medium text-slate-900">{term}</dt>
          <dd className="m-0 text-sm leading-6 text-slate-600">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

function GuideSection({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <section aria-labelledby={`${id}-title`} className="scroll-mt-32 border-t border-slate-200 pt-12 first:border-t-0 first:pt-0 lg:scroll-mt-24" data-guide-section id={id}>
      <p className="m-0 text-sm font-medium text-emerald-700">{eyebrow}</p>
      <h2 className="m-0 mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]" id={`${id}-title`}>
        {title}
      </h2>
      <P className="mt-3 text-slate-600">{intro}</P>
      <div className="mt-6 grid grid-cols-1 gap-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Permissions matrix                                                  */
/* ------------------------------------------------------------------ */

type Cell = boolean | string;

function MatrixCell({ value }: { value: Cell }): JSX.Element {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <Check aria-hidden size={14} strokeWidth={3} />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
        <Minus aria-hidden size={14} />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">{value}</span>;
}

function Matrix({ caption, columns, rows }: { caption: string; columns: string[]; rows: Array<{ action: string; cells: Cell[]; group?: string }> }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div aria-label={caption} className="relative overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/20" role="region" tabIndex={0}>
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500" scope="col">
                Action
              </th>
              {columns.map((c) => (
                <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500" key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr className={cn('border-b border-slate-100 last:border-b-0', r.group && 'border-t border-t-slate-200')} key={r.action}>
                <th className="sticky left-0 z-10 max-w-[260px] bg-white px-4 py-3 text-[13px] font-normal leading-5 text-slate-800" scope="row">
                  {r.action}
                </th>
                {r.cells.map((v, i) => (
                  <td className="px-3 py-3 text-center" key={i}>
                    <MatrixCell value={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const WORKSPACE_MATRIX = [
  { action: 'Belong to the workspace and switch to it from the top bar', cells: [true, true, true, true, true] },
  { action: 'Work in the projects they are added to', cells: [true, true, true, true, true] },
  { action: 'Edit the workspace name and settings', cells: [true, true, false, false, false] },
  { action: 'Invite members by email', cells: [true, true, false, false, false] },
  { action: 'Change members’ roles', cells: [true, 'Not Owners', false, false, false] },
  { action: 'Grant or remove the Owner role', cells: [true, false, false, false, false] },
  { action: 'Delete the workspace', cells: [true, false, false, false, false] },
  { action: 'See every agent and its activity, set agent policies', cells: [true, true, false, false, false], group: 'Agent governance' },
  { action: 'Approve or reject held agent actions', cells: [true, true, 'Project Admins', 'Project Admins', false] },
  { action: 'Suspend agents, stop all agents, export the report', cells: [true, true, false, false, false] },
  { action: 'Create agent keys and manage their own agents', cells: [true, true, true, true, true] }
];

const PROJECT_MATRIX = [
  { action: 'See the project', cells: [true, true, false] },
  { action: 'Rename, describe or delete the project', cells: [true, false, false] },
  { action: 'Add or remove project members and change their role', cells: [true, false, false] },
  { action: 'Create, edit and delete epics', cells: [true, false, false] },
  { action: 'Manage workflow states', cells: [true, false, false] },
  { action: 'Set the activity-history retention', cells: [true, false, false] },
  { action: 'Take part in approvals and chat', cells: [true, true, false] },
  { action: 'Create tasks', cells: [true, true, false], group: 'Tasks' },
  { action: 'Update tasks: status, progress, subtasks, comments', cells: [true, true, 'Assignee'] },
  { action: 'Edit, assign and reassign tasks they created', cells: [true, true, 'Creator'] },
  { action: 'Assign and reassign any task', cells: [true, false, false] },
  { action: 'Delete any task', cells: [true, false, false] }
];

/* ------------------------------------------------------------------ */
/* Table of contents                                                   */
/* ------------------------------------------------------------------ */

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const offset = 140;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 0) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        // At the very bottom, highlight the last section that is visible.
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.6) current = id;
        }
      }
      setActive(current);
    };
    const onScroll = (): void => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}

const SECTION_IDS = GUIDE_SECTIONS.map((s) => s.id);

function TocLinks({ active, onNavigate }: { active: string; onNavigate?: () => void }): JSX.Element {
  return (
    <ol className="m-0 grid list-none gap-0.5 p-0">
      {GUIDE_SECTIONS.map((s, i) => {
        const isActive = s.id === active;
        return (
          <li key={s.id}>
            <Link
              aria-current={isActive ? 'location' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-1.5 text-[13px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20',
                isActive ? 'border-emerald-600 bg-emerald-50/70 font-medium text-slate-900' : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              onClick={onNavigate}
              to={{ hash: s.id }}
            >
              <span className={cn('w-4 shrink-0 text-right text-xs tabular-nums', isActive ? 'text-emerald-700' : 'text-slate-400')}>{i + 1}</span>
              <span className="min-w-0">{s.label}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const SDK_INSTALL = `npm install @pristineai/integration-sdk`;

const SDK_INIT = `import { Engagement } from '@pristineai/integration-sdk';

// Run once when your app starts.
Engagement.init({
  apiKey: 'YOUR_SDK_KEY',
  userId: currentUser.id, // optional: who is signed in
});`;

const SDK_TRACK = `// Call this when something meaningful happens.
Engagement.track('project_created', { plan: 'pro' });`;

export default function GuidePage(): JSX.Element {
  useHashScroll();
  const active = useActiveSection(SECTION_IDS);
  const [tocOpen, setTocOpen] = useState(false);
  const activeIndex = Math.max(0, SECTION_IDS.indexOf(active));
  const activeLabel = GUIDE_SECTIONS[activeIndex]?.label ?? '';

  useEffect(() => {
    const prev = document.title;
    document.title = 'Product guide · Pristine';
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-white font-sans text-slate-700 selection:bg-emerald-500/15 selection:text-emerald-950">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-md"
        href="#guide-content"
      >
        Skip to content
      </a>
      <MarketingNav />

      {/* Header */}
      <header className="relative border-b border-slate-200 bg-slate-50">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_20%_0%,rgba(16,185,129,0.08),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="m-0 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <BookOpen aria-hidden size={16} /> Product guide
          </p>
          <h1 className="m-0 mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">The Pristine handbook</h1>
          <p className="m-0 mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Everything you need to run work and engage your users with Pristine: accounts, roles and permissions, projects and
            tasks, SLAs, AI, the engagement SDK and developer integrations, explained step by step.
          </p>
          <ul className="m-0 mt-8 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: 'getting-started', title: 'Getting started', body: 'Create an account and a workspace.' },
              { id: 'permissions', title: 'Permissions matrix', body: 'Who can do what, by role.' },
              { id: 'product-engagement', title: 'Install the SDK', body: 'Connect your app and publish a guide.' },
              { id: 'troubleshooting', title: 'Troubleshooting', body: 'Fixes for common problems.' }
            ].map((c) => (
              <li key={c.id}>
                <Link
                  className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                  to={{ hash: c.id }}
                >
                  <span className="flex items-center justify-between text-[15px] font-semibold text-slate-900">
                    {c.title}
                    <ArrowRight aria-hidden className="text-slate-400 transition-transform group-hover:translate-x-0.5" size={15} />
                  </span>
                  <span className="mt-1 text-[13px] text-slate-500">{c.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Phone / tablet: collapsible "On this page" */}
      <nav aria-label="On this page" className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <button
            aria-controls="guide-toc-mobile"
            aria-expanded={tocOpen}
            className="flex h-12 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/20"
            onClick={() => setTocOpen((o) => !o)}
            type="button"
          >
            <span className="min-w-0 truncate text-sm">
              <span className="text-slate-500">On this page: </span>
              <span className="font-medium text-slate-900">{activeLabel}</span>
            </span>
            <ChevronDown aria-hidden className={cn('shrink-0 text-slate-400 transition-transform', tocOpen && 'rotate-180')} size={16} />
          </button>
          {tocOpen ? (
            <div className="max-h-[60vh] overflow-y-auto pb-3" id="guide-toc-mobile">
              <TocLinks active={active} onNavigate={() => setTocOpen(false)} />
            </div>
          ) : null}
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
        {/* Desktop TOC */}
        <nav aria-label="Guide contents" className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6">
            <p className="m-0 mb-2 px-3 text-xs font-medium text-slate-500">On this page</p>
            <TocLinks active={active} />
          </div>
        </nav>

        <main className="min-w-0 max-w-[760px]" id="guide-content">
          <div className="grid grid-cols-1 gap-12">
            {/* ------------------------------------------------ Getting started */}
            <GuideSection
              eyebrow="1 · Basics"
              id="getting-started"
              intro="Create your account, secure it, and get into a workspace. This takes a couple of minutes."
              title="Getting started"
            >
              <H3>Create an account</H3>
              <Steps
                items={[
                  <>
                    Go to the <Link className="font-medium text-emerald-700 underline underline-offset-4" to="/register">sign-up page</Link> and enter your
                    first name, last name, email and a password of <strong className="font-medium text-slate-900">at least 8 characters</strong>.
                  </>,
                  <>
                    Select <Ui>Register</Ui>. You are signed in and land on your dashboard.
                  </>,
                  <>
                    Prefer not to manage another password? Select <Ui>Continue with Google</Ui> instead and pick your Google account.
                  </>
                ]}
              />
              <H3>Sign in</H3>
              <P>
                On the <Link className="font-medium text-emerald-700 underline underline-offset-4" to="/login">sign-in page</Link>, use your email and
                password and select <Ui>Sign In</Ui>, or use <Ui>Continue with Google</Ui>. Tick <Ui>Remember me</Ui> to stay signed in on a
                trusted device. Forgot your password? See <Link className="font-medium text-emerald-700 underline underline-offset-4" to={{ hash: 'account-security' }}>Account and security</Link>.
              </P>
              <H3>Two-factor authentication (2FA)</H3>
              <P>
                With two-factor authentication on, Pristine emails you a 6-digit code after you enter your password.
              </P>
              <Steps
                items={[
                  'Sign in with your email and password as usual.',
                  'Open the email from Pristine and copy the 6-digit verification code.',
                  <>
                    Enter it on the <Ui>Two-factor authentication</Ui> screen and select <Ui>Verify &amp; Sign In</Ui>.
                  </>
                ]}
              />
              <Callout tone="note">
                Codes are stored hashed, expire after a short time and allow only a limited number of attempts. If a code expires,
                sign in again to get a new one.
              </Callout>
              <H3>Create or join a workspace</H3>
              <P>A workspace groups people and projects. You can belong to several and switch between them from the top bar.</P>
              <Steps
                items={[
                  'Open the workspace switcher in the top bar.',
                  <>
                    Select <Ui>Create New Workspace</Ui>, give it a name and confirm. You become its Owner.
                  </>,
                  <>
                    To bring people in, choose <Ui>Invite Members</Ui> from the same menu and enter their email addresses.
                  </>
                ]}
              />
              <H3>Accept an invitation</H3>
              <Steps
                items={[
                  'Open the invitation link from your email. Pristine verifies the invitation and shows the workspace or project and your role.',
                  'If you do not have an account yet, register with the address the invitation was sent to.',
                  <>
                    Already signed in? Pending invitations also show in the inbox icon in the top bar. Accept one to join.
                  </>
                ]}
              />
              <Callout title="Tip: use the address you were invited with">
                Invitations are tied to an email address. Signing up with a different address will not match the invitation.
              </Callout>
            </GuideSection>

            {/* ------------------------------------------------ Workspaces and roles */}
            <GuideSection
              eyebrow="2 · People"
              id="workspaces-and-roles"
              intro="Pristine has two layers of roles. Workspace roles decide who administers the workspace. Project roles decide what people can do inside each project. Task creators and assignees get extra rights on their own tasks."
              title="Workspaces and roles"
            >
              <H3>Workspace roles</H3>
              <DefinitionGrid
                items={[
                  ['Owner', 'Everything an Admin can do, plus delete the workspace and grant or remove the Owner role. A workspace always keeps at least one Owner.'],
                  ['Admin', 'Edits the workspace name and settings, invites members and changes members’ roles. An Admin cannot change an Owner’s role or grant Owner.'],
                  ['Manager', 'Belongs to the workspace and works in the projects they are added to. No workspace administration.'],
                  ['Member', 'Belongs to the workspace and works in the projects they are added to. No workspace administration.'],
                  ['Guest', 'Meant for outside collaborators, such as clients or contractors, with limited access. Works only in the projects they are added to.']
                ]}
              />
              <H3>Project roles</H3>
              <DefinitionGrid
                items={[
                  ['Project Admin', 'The creator of a project is its Admin. Renames, describes or deletes the project; adds and removes project members and changes their role; creates, edits and deletes epics; manages workflow states; deletes any task; assigns and reassigns any task; sets activity-history retention.'],
                  ['Project Member', 'Sees the project, creates tasks, updates tasks (status, progress, subtasks, comments), edits, assigns and reassigns tasks they created, and takes part in approvals and chat.'],
                  ['Task creator', 'Can edit, assign and reassign their own task.'],
                  ['Task assignee', 'Can update the tasks assigned to them.']
                ]}
              />

              <H3 id="permissions">Permissions matrix</H3>
              <P>
                <Check aria-hidden className="inline align-[-2px] text-emerald-700" size={15} /> means the role can do it.{' '}
                <Minus aria-hidden className="inline align-[-2px] text-slate-400" size={15} /> means it is not part of that role. A label explains a
                partial right. On a phone, scroll the table sideways.
              </P>
              <H4>Workspace actions</H4>
              <Matrix caption="Workspace permissions by role" columns={['Owner', 'Admin', 'Manager', 'Member', 'Guest']} rows={WORKSPACE_MATRIX} />
              <H4>Project and task actions</H4>
              <Matrix caption="Project and task permissions by role" columns={['Project Admin', 'Project Member', 'Task creator / assignee']} rows={PROJECT_MATRIX} />
              <Callout tone="note">
                Creator and assignee rights are added on top of the person’s project role, for that one task: the creator can edit,
                assign and reassign it, and the assignee can update it. Project Admins can assign, reassign and delete any task.
              </Callout>

              <H3>Who should get which role?</H3>
              <Bullets
                items={[
                  <><strong className="font-medium text-slate-900">Owner:</strong> the founder or account holder, plus one backup person so the workspace never depends on a single account.</>,
                  <><strong className="font-medium text-slate-900">Admin:</strong> team leads or operations people who invite colleagues and keep roles tidy.</>,
                  <><strong className="font-medium text-slate-900">Manager:</strong> people who lead projects. Make them Project Admin on the projects they run.</>,
                  <><strong className="font-medium text-slate-900">Member:</strong> everyone on the team who does the work.</>,
                  <><strong className="font-medium text-slate-900">Guest:</strong> clients, freelancers and other outside collaborators. Add them only to the projects they need.</>
                ]}
              />
              <H3>Invite people and change roles</H3>
              <Steps
                items={[
                  <>
                    Workspace: open <Ui>Settings → Workspace</Ui> (Owners and Admins) to edit the workspace, see members and change their role.
                  </>,
                  <>
                    Project: open a project and select <Ui>Team</Ui> in the project header. Enter an email under <Ui>Add team member</Ui>, choose{' '}
                    <Ui>Admin</Ui> or <Ui>Member</Ui>, and send.
                  </>,
                  'To change a project member’s role or remove them, use the controls on their row in the Team panel (Project Admins only).'
                ]}
              />
            </GuideSection>

            {/* ------------------------------------------------ Projects and epics */}
            <GuideSection
              eyebrow="3 · Work"
              id="projects-and-epics"
              intro="Projects hold your work. Inside a project, epics group related tasks into milestones or themes."
              title="Projects and epics"
            >
              <H3>Create a project</H3>
              <Steps
                items={[
                  <>
                    In the sidebar, select <Ui>New Project</Ui>.
                  </>,
                  'Give it a name and an optional description, then create it. You become its Project Admin.',
                  <>
                    Or let AI do the first draft: open <Ui>AI Planner</Ui> and describe the project (see <Link className="font-medium text-emerald-700 underline underline-offset-4" to={{ hash: 'ai' }}>AI features</Link>).
                  </>
                ]}
              />
              <P>
                <Ui>All Projects</Ui> lists every project you can see, with search and pagination. Select several to delete them in bulk.
              </P>
              <H3>Work with epics</H3>
              <Steps
                items={[
                  <>
                    Open a project and select <Ui>Add epic</Ui> in the Epics column (Project Admins).
                  </>,
                  'Name the epic and set its status.',
                  'Select an epic to see its tasks, its SLA summary and its notes.'
                ]}
              />
              <DefinitionGrid
                items={[
                  ['Planned', 'Work that is defined but not started.'],
                  ['Active', 'Work in progress now.'],
                  ['Completed', 'All the work is done.'],
                  ['Archived', 'Kept for reference, out of the way.']
                ]}
              />
              <Callout>
                The project header holds the tools you use most: <Ui>Team</Ui>, <Ui>Chat</Ui>, <Ui>More</Ui> (project notes, workflow states,
                activity history, recalculate priorities, AI settings) and <Ui>AI Planner</Ui>.
              </Callout>
            </GuideSection>

            {/* ------------------------------------------------ Tasks */}
            <GuideSection
              eyebrow="4 · Work"
              id="tasks"
              intro="Tasks are the unit of work. Each one carries the information your team needs to get it done on time."
              title="Tasks"
            >
              <H3>Create a task</H3>
              <Steps
                items={[
                  'Open a project and select an epic.',
                  <>
                    Select <Ui>New Task</Ui>, fill in the fields below, then <Ui>Create Task</Ui>.
                  </>,
                  'Add subtasks from the task inspector, each with its own assignee and notes.'
                ]}
              />
              <H3>Task fields</H3>
              <DefinitionGrid
                items={[
                  ['Title and description', 'What needs to be done and any detail.'],
                  ['Priority', 'Low, Medium, High or Critical. The dynamic priority engine can raise or lower it later.'],
                  ['Status', 'Backlog, To do, In progress, In review, Blocked or Done, or your project’s custom workflow states.'],
                  ['Assignee', 'Who is responsible.'],
                  ['Due date', 'When it is due. Feeds the dynamic priority engine.'],
                  ['Subtasks', 'A checklist with progress; each subtask has its own assignee and notes.'],
                  ['Blocked', 'Block a task with a reason, and unblock it when the blocker clears.']
                ]}
              />
              <H3>Views, search and filters</H3>
              <Bullets
                items={[
                  <>Switch between the <strong className="font-medium text-slate-900">list</strong> and the <strong className="font-medium text-slate-900">kanban board</strong> inside an epic.</>,
                  <>Use <Ui>Search tasks...</Ui> to find a task by name.</>,
                  <>Select <Ui>Assigned to Me</Ui> to see only your work.</>,
                  <>Open <Ui>Filters</Ui> to filter by status, priority and assignee.</>
                ]}
              />
              <H3>Bulk actions</H3>
              <Steps
                items={['Select tasks with their checkboxes in the list.', <>Use <Ui>Assign to</Ui> to assign all selected tasks to one person.</>]}
              />
              <H3>The task inspector</H3>
              <P>Select a task to open its inspector drawer. It shows:</P>
              <Bullets
                items={[
                  'Properties: status, priority, assignee, due date and SLA health.',
                  'A subtasks checklist with a progress bar.',
                  'Comments, updated live.',
                  'Approvals, work notes and timers.'
                ]}
              />
            </GuideSection>

            {/* ------------------------------------------------ Workflow states */}
            <GuideSection
              eyebrow="5 · Work"
              id="workflow-states"
              intro="Every project can have its own workflow states, so the board matches how your team really works."
              title="Workflow states"
            >
              <Steps
                items={[
                  <>
                    Open the project and select <Ui>More → Workflow states</Ui>.
                  </>,
                  <>
                    Select <Ui>Add state</Ui>, enter a <Ui>State name</Ui>, pick a category and colour, and add an optional description.
                  </>,
                  'Save the state. Edit existing states the same way.'
                ]}
              />
              <Callout tone="warning" title="Only Project Admins can change the workflow">
                Members see the workflow states but cannot edit them. Ask a Project Admin to set them up.
              </Callout>
            </GuideSection>

            {/* ------------------------------------------------ SLAs */}
            <GuideSection
              eyebrow="6 · Deadlines"
              id="slas"
              intro="Service level agreements (SLAs) set how quickly work should get a first response and a resolution, by priority."
              title="SLAs"
            >
              <H3>Set SLA targets</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Settings → SLA Targets</Ui>.
                  </>,
                  'For each priority (Low, Medium, High, Critical), set a response target and a resolution target.',
                  'Save. A background scheduler checks every task against these targets.'
                ]}
              />
              <H3>Read SLA health</H3>
              <P>Each task shows one of these SLA states:</P>
              <DefinitionGrid
                items={[
                  [<span className="inline-flex items-center gap-1.5" key="h"><span className="h-2 w-2 rounded-full bg-emerald-500" />Healthy</span>, 'Within target.'],
                  [<span className="inline-flex items-center gap-1.5" key="n"><span className="h-2 w-2 rounded-full bg-amber-500" />Near breach</span>, 'Close to missing a target. Act now.'],
                  [<span className="inline-flex items-center gap-1.5" key="b"><span className="h-2 w-2 rounded-full bg-red-500" />Breached</span>, 'A target was missed.'],
                  [<span className="inline-flex items-center gap-1.5" key="p"><span className="h-2 w-2 rounded-full bg-slate-400" />Paused</span>, 'The SLA clock is not running for this task.'],
                  [<span className="inline-flex items-center gap-1.5" key="c"><span className="h-2 w-2 rounded-full bg-sky-500" />Completed</span>, 'The task is finished.']
                ]}
              />
              <P>
                The epic header summarises SLA health for its tasks: the <strong className="font-medium text-slate-900">breached count</strong>,{' '}
                <strong className="font-medium text-slate-900">response %</strong>, <strong className="font-medium text-slate-900">resolution %</strong>{' '}
                and <strong className="font-medium text-slate-900">average resolve time</strong>.
              </P>
              <Callout>Start with generous targets, watch the response and resolution percentages for a few weeks, then tighten them.</Callout>
            </GuideSection>

            {/* ------------------------------------------------ Dynamic priority */}
            <GuideSection
              eyebrow="7 · Deadlines"
              id="dynamic-priority"
              intro="Two automations keep your plan honest: priorities that update themselves, and tasks that never fall off the calendar."
              title="Dynamic priority and daily rollover"
            >
              <H3>Dynamic priority engine</H3>
              <P>
                Priorities are re-scored automatically from <strong className="font-medium text-slate-900">due dates</strong>,{' '}
                <strong className="font-medium text-slate-900">SLA risk</strong> and <strong className="font-medium text-slate-900">activity</strong>. A
                task that is getting close to its due date or its SLA target moves up, so the most urgent work rises to the top.
              </P>
              <Steps
                items={[
                  'Set a sensible starting priority and a due date when you create the task.',
                  <>
                    To re-score right away, open the project and select <Ui>More → Recalculate priorities</Ui>.
                  </>
                ]}
              />
              <H3>Daily rollover</H3>
              <P>
                A scheduled job moves unfinished tasks for a day to the next day automatically. You start each morning with yesterday’s
                leftovers already in today’s plan.
              </P>
              <Callout tone="note">Use the AI daily planner after rollover to decide what to focus on today.</Callout>
            </GuideSection>

            {/* ------------------------------------------------ Collaboration */}
            <GuideSection
              eyebrow="8 · Team"
              id="collaboration"
              intro="Talk, decide and record history right next to the work."
              title="Collaboration"
            >
              <H3>Comments</H3>
              <P>Open a task’s inspector and write in the comments area. Comments appear live for everyone viewing the task.</P>
              <H3>Approvals</H3>
              <Steps
                items={[
                  <>
                    In the task inspector, select <Ui>Request Approval</Ui>.
                  </>,
                  <>
                    Choose the approvers under <Ui>Select Approvers (ordered)</Ui> and explain why the approval is needed.
                  </>,
                  <>
                    Approvers open the task and select <Ui>Approve</Ui> or <Ui>Reject</Ui>.
                  </>
                ]}
              />
              <H3>Notes and documents</H3>
              <Bullets
                items={[
                  <>Project notes: <Ui>More → Project notes</Ui>.</>,
                  'Epic notes: in the selected epic.',
                  'Task work notes: in the task inspector.'
                ]}
              />
              <H3>Project chat</H3>
              <P>
                Select <Ui>Chat</Ui> in the project header to open the chat panel. Messages arrive live over WebSockets, and threads are
                visible only to project members.
              </P>
              <H3>Activity history and retention</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>More → Activity history</Ui> to see an audit trail of the project’s activity, grouped by day and filterable.
                  </>,
                  'Project Admins can set a retention policy that decides how long history is kept.'
                ]}
              />
              <H3>Notifications and inbox</H3>
              <Bullets
                items={[
                  <>The <Ui>Notifications</Ui> bell shows updates on your tasks.</>,
                  'The inbox icon shows workspace invitations and team updates. Accept invitations from there.'
                ]}
              />
            </GuideSection>

            {/* ------------------------------------------------ AI */}
            <GuideSection
              eyebrow="9 · AI"
              id="ai"
              intro="AI helps you plan projects, break down tasks and organise your day, using the model each project chooses."
              title="AI features"
            >
              <H3>AI Planner</H3>
              <Steps
                items={[
                  <>
                    Select <Ui>AI Planner</Ui> in the project header.
                  </>,
                  'Describe the project in plain language: what you are building, for whom, and any constraints.',
                  'Review the proposed epics and tasks. Ask for changes in the planner chat, for example “split billing into its own epic”.',
                  'Approve the plan to create the project with its epics and tasks.'
                ]}
              />
              <H3>AI task breakdown</H3>
              <Steps
                items={[
                  'Open a task and choose to decompose it with AI.',
                  'Write a short description of what the task involves.',
                  <>
                    Review the suggested subtasks and select <Ui>Apply Breakdown to Task</Ui>.
                  </>
                ]}
              />
              <H3>AI daily planner</H3>
              <P>
                Open the daily planner, add constraints such as meetings or focus time, and get a plan for the day built from your tasks,
                with a short <strong className="font-medium text-slate-900">Today’s Focus Summary</strong>.
              </P>
              <H3>AI settings and providers</H3>
              <Steps
                items={[
                  <>
                    Open the project and select <Ui>More → AI settings</Ui>.
                  </>,
                  <>
                    Turn on <Ui>Enable Custom AI Planner</Ui> and choose a provider: Google Gemini, OpenAI, Anthropic Claude, or Groq / local.
                  </>,
                  'Enter the credentials the provider needs and save.'
                ]}
              />
              <Callout tone="note" title="“AI off”">
                A project without a provider falls back to built-in rules. Planning features still respond, but without a language model.
              </Callout>
              <H3>Semantic intelligence</H3>
              <P>
                Open <Ui>Intelligence</Ui> in the sidebar to compare metrics across projects over a time range, spot anomalies and trends,
                and drill into the lineage behind a metric.
              </P>
            </GuideSection>

            {/* ------------------------------------------------ Prompts */}
            <GuideSection
              eyebrow="10 · AI"
              id="prompts"
              intro="Manage the prompts your team relies on like code: templates, versions, testing and gradual rollouts."
              title="Prompt library and playground"
            >
              <H3>Prompt library</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Prompt Library</Ui> in the sidebar.
                  </>,
                  <>
                    Select <Ui>New Prompt</Ui>, write the template and save it with <Ui>Create Prompt</Ui>.
                  </>,
                  'Organise prompts in folders and mark the ones you use most as favourites. Every change is kept as a version.'
                ]}
              />
              <H3>Playground</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Prompt Playground</Ui> and pick a prompt.
                  </>,
                  'Edit the prompt, fill in its variables and set the model parameters.',
                  <>
                    Run it, then use <Ui>Compare</Ui> to put two versions side by side.
                  </>
                ]}
              />
              <H3>Deploy and canary rollouts</H3>
              <Steps
                items={[
                  <>
                    In the Prompt Library, open a prompt&apos;s <Ui>⋮</Ui> menu and select <Ui>Deploy</Ui>. Every version is listed with its
                    environment: development, staging, canary or production.
                  </>,
                  <>
                    Select <Ui>Check</Ui> on a version to scan it for secrets, personal data and prompt-injection phrases before it ships.
                  </>,
                  <>
                    Select <Ui>Start canary</Ui> (recommended) to send 5% of traffic to the new version while production serves the rest.
                    Other options are <Ui>To staging</Ui> and <Ui>Publish</Ui>, which switches all traffic at once.
                  </>,
                  'The canary card shows the phase (5%, 25%, 50%, 100%), requests, error rate and latency for both versions. Advance, pause or resume it, roll it back, or complete it.'
                ]}
              />
              <Callout>Use canary rollouts for any prompt that runs in production. A small share of traffic is enough to catch surprises.</Callout>
            </GuideSection>

            {/* ------------------------------------------------ Product engagement */}
            <GuideSection
              eyebrow="11 · Your users"
              id="product-engagement"
              intro="Show guides, surveys and checklists inside your own app with the JavaScript SDK, aim them at the right users, and measure the results."
              title="Product engagement"
            >
              <H3 id="create-integration">1. Create an integration</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>SDK Integrations</Ui> in the sidebar and select <Ui>New integration</Ui>.
                  </>,
                  <>
                    Enter an <Ui>Integration name</Ui>, choose the <Ui>Environment</Ui> (Development, Staging or Production) and enter the{' '}
                    <Ui>Application URL</Ui>.
                  </>,
                  <>
                    Add any <Ui>Additional allowed origins</Ui>, for example <Code>http://localhost:5173</Code> for local development.
                  </>,
                  <>
                    Select <Ui>Create Integration</Ui> and copy the <Ui>Public SDK key</Ui>.
                  </>
                ]}
              />
              <Callout tone="warning" title="The key is shown only once">
                Copy the SDK key right away and store it with your app’s configuration. Lost it? Open the integration and use{' '}
                <Ui>Regenerate Key</Ui>. Remember to update your app with the new key.
              </Callout>
              <H3>2. Install the SDK</H3>
              <CodeBlock code={SDK_INSTALL} label="Terminal" />
              <CodeBlock code={SDK_INIT} label="app.ts · initialise once" />
              <CodeBlock code={SDK_TRACK} label="app.ts · track events" />
              <H3>3. Verify the connection</H3>
              <Steps
                items={[
                  'Open your app in a browser at one of the allowed origins.',
                  <>
                    In Pristine, open the integration. Its status changes from <Ui>Pending</Ui> to <Ui>Connected</Ui>, and the overview shows the
                    last activity and SDK version.
                  </>,
                  'The guided setup on the integration ticks off each step automatically: install, initialise, connect, track first event, publish first guide or survey.'
                ]}
              />
              <DefinitionGrid
                items={[
                  ['Pending', 'Created, but the SDK has not connected yet.'],
                  ['Connected', 'Your app has connected with this key.'],
                  ['Disabled', 'Turned off for now. Enable it again any time.'],
                  ['Revoked', 'Permanently switched off.']
                ]}
              />

              <H3 id="guides">4. Create a guide</H3>
              <Steps
                items={[
                  <>
                    Open the integration, go to <Ui>Guides</Ui> and select <Ui>New guide</Ui>.
                  </>,
                  'Start from a template (Welcome message, Product tour, Feature announcement or Feature tip) or from scratch, and pick a format.',
                  'Add steps with a heading, body text, buttons and, for tours and tips, the CSS selector of the element to point at.',
                  'Set the guide’s priority and targeting, and check the live preview.',
                  <>
                    Save it. In the guides list, select <Ui>Publish</Ui> on the guide and confirm with <Ui>Publish Live</Ui>.
                  </>
                ]}
              />
              <P>Choose the format that fits the moment:</P>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                {(
                  [
                    ['modal', 'Modal', 'A centred dialog. Use it for welcome messages and important announcements that deserve full attention.'],
                    ['tour', 'Product tour', 'Multi-step tooltips that point at elements. Use it to walk new users through a workflow.'],
                    ['tip', 'Smart tip', 'A small contextual hint. Use it to explain one feature where it lives.'],
                    ['hotspot', 'Hotspot', 'A pulsing dot. Use it to draw attention to something new without interrupting.'],
                    ['banner', 'Banner', 'A slim bar across the page. Use it for notices, maintenance windows and updates.']
                  ] as const
                ).map(([id, title, body]) => (
                  <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" key={id}>
                    <GuideFormatIllustration format={id} />
                    <p className="m-0 mt-3 text-[15px] font-semibold text-slate-900">{title}</p>
                    <p className="m-0 mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </li>
                ))}
              </ul>

              <H3 id="surveys">5. Create a survey</H3>
              <Steps
                items={[
                  <>
                    Go to <Ui>Surveys</Ui> and select <Ui>New survey</Ui>.
                  </>,
                  'Start from a template (NPS, Satisfaction (CSAT), Feature feedback or Onboarding feedback) or from scratch.',
                  'Add questions and pick a type for each one.',
                  'Set targeting, preview and publish.'
                ]}
              />
              <DefinitionGrid
                items={[
                  ['NPS', 'How likely to recommend, from 0 to 10. Results split into promoters, passives and detractors.'],
                  ['CSAT', 'How satisfied the user is.'],
                  ['Opinion scale', 'A rating on a numeric scale.'],
                  ['Single choice', 'Pick one option.'],
                  ['Multiple choice', 'Pick any number of options.'],
                  ['Dropdown', 'Pick one option from a compact list.'],
                  ['Yes / No', 'A quick binary answer.'],
                  ['Emoji', 'React with an emoji.'],
                  ['Short text', 'A one-line free-text answer.'],
                  ['Long text', 'A longer free-text answer.'],
                  ['File upload', 'Let the user attach a file.']
                ]}
              />

              <H3>6. Create a checklist</H3>
              <Steps
                items={[
                  <>
                    Go to <Ui>Checklists</Ui> and select <Ui>New checklist</Ui>.
                  </>,
                  'Add the items a new user should complete, in order.',
                  'Set targeting and publish.'
                ]}
              />

              <H3>7. Targeting and segments</H3>
              <P>Every guide, survey and checklist is shown either to everyone or to a segment.</P>
              <Steps
                items={[
                  <>
                    Go to <Ui>Segments</Ui> and select <Ui>Create Segment</Ui>.
                  </>,
                  'Add rules on page URL, user attributes and events, for example “plan equals pro”.',
                  <>
                    Use <Ui>Test</Ui> to check whether a user matches, then save.
                  </>,
                  'In any guide, survey or checklist, choose the saved segment in its targeting settings.'
                ]}
              />

              <H3>8. Publishing lifecycle</H3>
              <LifecycleMock />
              <DefinitionGrid
                items={[
                  ['Draft', 'Being built. Not shown to anyone.'],
                  ['Live', 'Published after you confirm. Shown to matching users.'],
                  ['Paused', 'Temporarily hidden. Resume any time.'],
                  ['Archived', 'Retired and kept for its results.']
                ]}
              />

              <H3>9. Analytics and responses</H3>
              <Bullets
                items={[
                  'Each guide and survey shows views, completions, dismissals and step drop-off.',
                  'Surveys show every response and per-question results, including NPS promoters, passives and detractors.',
                  <>The <Ui>Analytics</Ui> tab gives an overview across experiences.</>
                ]}
              />
            </GuideSection>

            {/* ------------------------------------------------ Event tracking */}
            <GuideSection
              eyebrow="12 · Your users"
              id="event-tracking"
              intro="Every event your app sends with the SDK is stored and searchable."
              title="Event tracking"
            >
              <Steps
                items={[
                  <>
                    Send events from your app with <Code>Engagement.track(name, properties)</Code>.
                  </>,
                  <>
                    Open the integration and go to <Ui>Events</Ui>.
                  </>,
                  'Filter by event name and time range.',
                  'Select an event to inspect its full payload in the payload viewer.'
                ]}
              />
              <P>
                Engagement analytics add the bigger picture: <strong className="font-medium text-slate-900">monthly tracked users</strong>,{' '}
                <strong className="font-medium text-slate-900">top events</strong> and <strong className="font-medium text-slate-900">NPS</strong>.
              </P>
              <Callout>
                Use consistent, past-tense event names such as <Code>project_created</Code> or <Code>invite_sent</Code>. They are easier to
                filter and to use in segment rules.
              </Callout>
            </GuideSection>

            {/* ------------------------------------------------ Developer integrations */}
            <GuideSection
              eyebrow="13 · Developers"
              id="developer-integrations"
              intro="Connect Pristine to scripts, AI assistants and mobile devices."
              title="Developer integrations"
            >
              <H3>Agent keys</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Agent Governance</Ui> in the sidebar and select <Ui>New agent key</Ui>, or create one from the ChatGPT or MCP
                    settings.
                  </>,
                  'Name it after the tool that will use it, choose its scopes and projects, and set an expiry.',
                  'Copy the key straight away: it is stored hashed and never shown again. Send it as Authorization: Bearer <key>.'
                ]}
              />
              <Callout tone="note">
                Your old personal Sync key keeps working and moves to a hashed key the first time it is used. It is flagged as high risk
                because it has full access; replace it with scoped keys, or create a new personal key in{' '}
                <Ui>Settings → Profile &amp; API Key</Ui>.
              </Callout>
              <H3>ChatGPT integration</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Settings → ChatGPT Integration</Ui>.
                  </>,
                  'Create a ChatGPT key, then follow the steps to add Pristine as a GPT Action to your custom GPT.',
                  'Once connected, ChatGPT can read and update your tasks.'
                ]}
              />
              <H3>MCP server</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Settings → MCP Integration</Ui>.
                  </>,
                  'Create an MCP key and copy the server details into your MCP client, such as Claude Desktop or an IDE.',
                  'Your client can now use around 74 tools and 4 prompts to manage projects and tasks.'
                ]}
              />
              <H3>Companion devices</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Settings → Companion Devices</Ui> and create a new device pairing.
                  </>,
                  'On the phone or tablet, scan the QR code, or enter the one-time pairing key on the sign-in page’s Companion option.',
                  'Manage and revoke paired devices from the same settings page.'
                ]}
              />
              <Callout tone="warning">Treat agent keys like passwords. Never commit them to source control or paste them into shared documents.</Callout>
            </GuideSection>

            {/* ------------------------------------------------ Agent governance */}
            <GuideSection
              eyebrow="14 · Governance"
              id="agent-governance"
              intro="See every AI agent acting in your workspace, decide what it may do and keep a record."
              title="Agent governance"
            >
              <P>
                An <strong className="font-medium text-slate-900">agent</strong> is anything that acts for someone without them clicking
                through the portal: API keys, MCP clients such as Claude Desktop, ChatGPT Actions, companion devices, and the AI providers
                that power project AI. Each one appears in <Ui>Agent Governance</Ui> the first time it acts.
              </P>
              <H3>Inventory and risk</H3>
              <Bullets
                items={[
                  'The Agents tab lists every agent with its owner, scopes, projects, status, last activity and a risk score.',
                  'Open an agent to see why it scored the way it did. Each factor names the framework it relates to.',
                  'High risk usually means admin scope, access to every project, a key that never expires or a legacy full-access key.'
                ]}
              />
              <H3>Unregistered agents (shadow AI)</H3>
              <P>
                A script, AI framework or automated browser that calls Pristine with someone&apos;s own login, rather than an agent key, is
                caught on its first call and listed as an <Ui>Unregistered</Ui> agent, with the reasons it was flagged. It acts with that
                person&apos;s full access, so it scores as high risk and raises an alert. From then on its changes are logged and policies
                apply to it like to any agent; people working in the portal are not affected.
              </P>
              <Steps
                items={[
                  <>
                    Open it from <Ui>Unregistered agents</Ui> on the overview and select <Ui>Review</Ui>.
                  </>,
                  <>
                    If it is yours, select <Ui>Give it its own key</Ui>, choose only the access it needs and update the script to send the key.
                    It can no longer use your login, and you stay signed in.
                  </>,
                  <>
                    Otherwise select <Ui>Block</Ui>. To refuse every new one, Owners and Admins can turn on <Ui>Require agent keys</Ui> under{' '}
                    <Ui>Compliance</Ui>.
                  </>
                ]}
              />
              <Callout tone="tip">
                The <Ui>Unregistered agents are read-only</Ui> policy template lets them keep reading while their owners move them to keys.
              </Callout>
              <H3>Policies</H3>
              <Steps
                items={[
                  <>
                    Open <Ui>Agent Governance → Policies</Ui> (Owners and Admins) and pick a template, or select <Ui>New policy</Ui>.
                  </>,
                  'Choose what happens: allow, block or require approval. Match on agent type, action (for example task:delete or *:delete), minimum risk, project or time of day.',
                  <>
                    Leave it in <Ui>Advisory</Ui> mode to see what it would do in the activity log, then select <Ui>Enforce</Ui>.
                  </>,
                  <>
                    Use <Ui>Test policies</Ui> to check what would happen to an action before it is tried.
                  </>
                ]}
              />
              <Callout tone="tip">The highest priority policy that matches decides. On a tie, block beats require approval, which beats allow.</Callout>
              <H3>Approvals</H3>
              <P>
                When a policy requires approval, the agent gets an approval id instead of a result. Workspace Owners and Admins, and Admins of
                the project involved, see the request under <Ui>Approvals</Ui> with its inputs (personal data masked). Approving runs the
                action once, exactly as requested; the agent reads the outcome with <code className="font-mono text-[13px]">agents:approval_status</code>{' '}
                over MCP or <code className="font-mono text-[13px]">GET /api/agents/approvals/:id</code>. Requests expire after 24 hours.
              </P>
              <H3>Stop an agent</H3>
              <Bullets
                items={[
                  'Suspend an agent from its detail panel; it is refused on its next call. Resume it later.',
                  'Revoke an agent to cut it off for good, or rotate a key to replace it.',
                  <>
                    In an emergency, <Ui>Stop all agents</Ui> suspends every active agent in the workspace at once.
                  </>
                ]}
              />
              <H3>Activity, alerts and undo</H3>
              <P>
                Every agent action is recorded with its decision for 90 days, with inputs masked. Alerts flag bulk deletes, unusual volume,
                repeated refusals, first use of a new action and unused agents. Changes an agent made to a task or epic can be undone from
                the activity log. Export the log as CSV or JSON for audits.
              </P>
              <H3>Compliance report and AI data masking</H3>
              <P>
                The <Ui>Compliance</Ui> tab scores your setup against controls mapped to the OWASP Top 10 for LLM applications, the NIST AI
                Risk Management Framework, ISO/IEC 42001 and the EU AI Act, with a recommendation for each gap. Turn on{' '}
                <Ui>AI data masking</Ui> there to replace emails, phone numbers, card numbers and secrets before prompts reach AI providers.
              </P>
              <Callout tone="note">The framework mapping supports your reviews; it is not a certification of compliance.</Callout>
              <H3>Prompt checks</H3>
              <P>
                Before a prompt version starts a canary rollout, Pristine checks it for embedded secrets and known prompt-injection phrases.
                High-severity findings stop the rollout until the prompt is fixed or the finding is acknowledged.
              </P>
            </GuideSection>

            {/* ------------------------------------------------ Account and security */}
            <GuideSection
              eyebrow="15 · Account"
              id="account-security"
              intro="How sessions, password resets and Google sign-in work."
              title="Account and security"
            >
              <H3>Sessions</H3>
              <P>
                Each device you sign in on gets its own session, using an access token and a refresh token so you stay signed in safely.
                You can sign in elsewhere and revoke sessions you no longer use.
              </P>
              <H3>Reset your password</H3>
              <Steps
                items={[
                  <>
                    On the sign-in page, select <Ui>Forgot password</Ui>.
                  </>,
                  <>
                    Enter your email and select <Ui>Send reset code</Ui>.
                  </>,
                  <>
                    Enter the one-time code from the email and your new password (at least 8 characters), then select <Ui>Reset password</Ui>.
                  </>
                ]}
              />
              <Callout tone="note">Resetting your password signs out your other sessions, which is useful if you think someone else has access.</Callout>
              <H3>Google sign-in</H3>
              <P>
                Select <Ui>Continue with Google</Ui> on the sign-in or sign-up page. Pristine signs you in with your Google account; a new
                account is created the first time. If sign-in fails, see <Link className="font-medium text-emerald-700 underline underline-offset-4" to={{ hash: 'troubleshooting' }}>Troubleshooting</Link>.
              </P>
            </GuideSection>

            {/* ------------------------------------------------ Troubleshooting */}
            <GuideSection
              eyebrow="16 · Help"
              id="troubleshooting"
              intro="Fixes for the problems people run into most often."
              title="Troubleshooting and FAQ"
            >
              <div className="grid gap-3">
                {[
                  {
                    q: '“Google sign-in couldn’t be completed”',
                    a: (
                      <Bullets
                        items={[
                          'Try again: the Google sign-in window may have been closed or timed out.',
                          'Allow pop-ups and third-party sign-in for the site in your browser.',
                          'Make sure you pick the Google account that matches your Pristine email.',
                          'Still stuck? Sign in with email and password, or use Forgot password to set one.'
                        ]}
                      />
                    )
                  },
                  {
                    q: 'The SDK does not connect (integration stays Pending)',
                    a: (
                      <Bullets
                        items={[
                          'The most common cause is an origin that is not allowed. SDK requests are only accepted from the integration’s allowed origins. Add the exact origin your app runs on (scheme, host and port, e.g. http://localhost:5173) to the integration.',
                          'Check that you used the SDK key of this integration and environment. If you regenerated the key, update your app.',
                          'Make sure Engagement.init runs when your app starts, then reload the page.',
                          'Check that the integration is enabled, not Disabled or Revoked.'
                        ]}
                      />
                    )
                  },
                  {
                    q: 'AI features say “AI off”',
                    a: (
                      <P>
                        The project has no AI provider configured, so it uses built-in rules. Open <Ui>More → AI settings</Ui>, turn on the custom
                        AI planner, choose a provider and enter its credentials.
                      </P>
                    )
                  },
                  {
                    q: 'A guide or survey does not appear in my app',
                    a: (
                      <Bullets
                        items={[
                          'Check that it is Live, not Draft or Paused.',
                          'Check its targeting: is your user in the segment, and does the page URL match?',
                          'For tours and smart tips, make sure the CSS selector matches an element on the page.'
                        ]}
                      />
                    )
                  },
                  {
                    q: 'I can’t edit workflow states, epics or project members',
                    a: <P>These actions are for Project Admins. Ask the project’s Admin to change your role in the Team panel.</P>
                  },
                  {
                    q: 'I lost my SDK key',
                    a: (
                      <P>
                        Keys are shown only once. Open the integration and select <Ui>Regenerate Key</Ui>, then update your app with the new key.
                      </P>
                    )
                  },
                  {
                    q: 'My 2FA or reset code does not work',
                    a: <P>Codes expire and allow a limited number of attempts. Request a new code and use the most recent email.</P>
                  }
                ].map((item) => (
                  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm" key={item.q}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3.5 text-[15px] font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">{item.q}</span>
                      <ChevronDown aria-hidden className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" size={16} />
                    </summary>
                    <div className="px-4 pb-4">{item.a}</div>
                  </details>
                ))}
              </div>
              <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-900 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="m-0 text-lg font-semibold text-white">Ready to try it?</p>
                  <p className="m-0 mt-1 text-sm text-slate-300">Create a workspace and follow this guide as you go.</p>
                </div>
                <Link
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"
                  to="/register"
                >
                  Get started <ArrowRight aria-hidden size={15} />
                </Link>
              </div>
            </GuideSection>
          </div>
        </main>
      </div>

      <MarketingFooter />
    </div>
  );
}
