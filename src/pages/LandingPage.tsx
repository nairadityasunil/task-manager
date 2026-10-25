import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  Code2,
  FileText,
  Fingerprint,
  FolderKanban,
  GitBranch,
  History,
  KeyRound,
  LayoutList,
  ListChecks,
  ListTree,
  Lock,
  LogIn,
  Mail,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  MonitorSmartphone,
  MousePointerClick,
  Plug,
  Radar,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Timer,
  UserPlus,
  Users,
  Workflow,
  Zap,
  type LucideIcon
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { cn } from '@/components/ui';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { CheckList, CodeBlock, SectionHeading, ctaClass } from '@/components/marketing/primitives';
import { useHashScroll } from '@/components/marketing/useHashScroll';
import { useReveal } from '@/components/marketing/useReveal';
import {
  BreakdownMock,
  ChatMock,
  ChecklistMock,
  DailyPlanMock,
  EventsMock,
  FunnelMock,
  GuideFormatIllustration,
  HeroMock,
  InspectorMock,
  IntelligenceMock,
  LifecycleMock,
  McpMock,
  ModelsMock,
  NpsMock,
  NpsResultsMock,
  PlannerMock,
  PlaygroundMock,
  RolloverMock,
  SegmentMock,
  SetupMock,
  SlaMock,
  TaskViewsMock
} from '@/components/marketing/Mockups';

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const SDK_SNIPPET = `// npm install @pristineai/integration-sdk
import { Engagement } from '@pristineai/integration-sdk';

// Run once when your app starts.
Engagement.init({
  apiKey: 'YOUR_SDK_KEY',
  userId: currentUser.id, // optional: who is signed in
});

// Call this when something meaningful happens.
Engagement.track('project_created', { plan: 'pro' });`;

const AI_TABS: Array<{ id: string; label: string; icon: LucideIcon; title: string; body: string; points: string[]; mock: () => JSX.Element }> = [
  {
    id: 'planner',
    label: 'AI Planner',
    icon: Zap,
    title: 'Describe a project, get a plan',
    body: 'Write what you want to build in plain language. The AI Planner proposes epics and tasks, you refine the plan in a conversation, and approving it creates the project.',
    points: ['Plain-language input, no template to fill', 'Refine by chatting: add, split or drop work', 'Approve to create the project with its epics and tasks'],
    mock: PlannerMock
  },
  {
    id: 'breakdown',
    label: 'Task breakdown',
    icon: ListTree,
    title: 'Split big tasks into subtasks',
    body: 'Give a task a short description and let AI suggest the subtasks. Review the list, then apply it to the task.',
    points: ['Works from a one-line description', 'Suggested subtasks land in the task’s checklist', 'Subtasks keep their own assignees and notes'],
    mock: BreakdownMock
  },
  {
    id: 'daily',
    label: 'Daily planner',
    icon: CalendarClock,
    title: 'Plan your day in seconds',
    body: 'The AI daily planner looks at your tasks and the constraints you give it, and suggests what to focus on today.',
    points: ['Uses your real tasks and their priorities', 'Respects constraints such as meetings or focus time', 'Gives you a short focus summary for the day'],
    mock: DailyPlanMock
  },
  {
    id: 'models',
    label: 'Your own model',
    icon: Bot,
    title: 'Bring your own model, per project',
    body: 'Each project can use its own AI provider: Google Gemini, OpenAI, Anthropic Claude, or Groq and local models. Projects without a provider fall back to built-in rules.',
    points: ['Choose the provider per project in AI settings', 'Keep sensitive projects on a model you trust', 'No provider means “AI off”: built-in rules still work'],
    mock: ModelsMock
  },
  {
    id: 'intelligence',
    label: 'Semantic intelligence',
    icon: BrainCircuit,
    title: 'See patterns across projects',
    body: 'The Intelligence page compares metrics across projects over a time range, highlights anomalies and trends, and lets you drill into the lineage behind a number.',
    points: ['Compare projects side by side over time', 'Spot anomalies and trends early', 'Drill into lineage to see where a metric comes from'],
    mock: IntelligenceMock
  },
  {
    id: 'prompts',
    label: 'Prompt library',
    icon: Sparkles,
    title: 'A prompt library and playground',
    body: 'Keep reusable prompt templates in folders with favourites and versions. In the playground, set variables and model parameters, run and compare versions, then deploy one to production with a canary rollout.',
    points: ['Folders, favourites and version history', 'Variables, model parameters and side-by-side comparison', 'Deploy to production, gradually, with canary rollouts'],
    mock: PlaygroundMock
  }
];

const GUIDE_FORMATS: Array<{ id: 'modal' | 'tour' | 'tip' | 'hotspot' | 'banner'; title: string; body: string }> = [
  { id: 'modal', title: 'Modal', body: 'A centred dialog for welcome messages and big announcements.' },
  { id: 'tour', title: 'Product tour', body: 'Multi-step tooltips that point at elements on the page.' },
  { id: 'tip', title: 'Smart tip', body: 'A small, contextual hint next to the feature it explains.' },
  { id: 'hotspot', title: 'Hotspot', body: 'A pulsing dot that invites users to discover something new.' },
  { id: 'banner', title: 'Banner', body: 'A slim bar across the page for notices and updates.' }
];

const QUESTION_TYPES = [
  'NPS',
  'CSAT',
  'Opinion scale',
  'Single choice',
  'Multiple choice',
  'Dropdown',
  'Yes / No',
  'Emoji',
  'Short text',
  'Long text',
  'File upload'
];

const WORKS_WITH = [
  'OpenAI',
  'Anthropic Claude',
  'Google Gemini',
  'Groq',
  'Ollama',
  'ChatGPT Actions',
  'Claude Desktop',
  'Cursor',
  'VS Code',
  'React',
  'Next.js',
  'Vue',
  'Google sign-in',
  'Model Context Protocol'
];

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: 'What is Pristine?',
    a: 'Pristine is one workspace for two jobs. Your team plans and ships work with projects, epics and tasks, SLAs, self-updating priorities and AI planning. You also engage the people who use your own product with in-app guides, surveys, checklists and event analytics through a JavaScript SDK.'
  },
  {
    q: 'How do I control what AI agents can do?',
    a: 'Open Agent Governance in the portal. Every agent that acts in your workspace is listed with its owner, access and risk. Limit its scopes and projects, add policies that block actions or require approval, and suspend any agent instantly.'
  },
  {
    q: 'Do I need to install the SDK to manage tasks?',
    a: 'No. Projects, tasks, SLAs, AI and collaboration work as soon as you create a workspace. The SDK is only needed when you want to show guides, surveys or checklists inside your own app, or track events from it.'
  },
  {
    q: 'Which AI models can I use?',
    a: 'Each project has its own AI settings. You can pick Google Gemini, OpenAI, Anthropic Claude, or Groq and local models. A project without a provider falls back to built-in rules, shown as “AI off”.'
  },
  {
    q: 'How are task priorities decided?',
    a: 'You set a priority (Low, Medium, High or Critical) when you create a task. The dynamic priority engine then re-scores priorities automatically from due dates, SLA risk and activity. Project admins can also run it on demand from More → Recalculate priorities.'
  },
  {
    q: 'What happens to tasks I don’t finish today?',
    a: 'Daily rollover moves unfinished tasks for a day to the next day automatically, so nothing silently slips off the plan.'
  },
  {
    q: 'How do SLAs work?',
    a: 'You set response and resolution targets per priority in Settings → SLA Targets. Each task then shows its SLA health (healthy, near breach, breached, paused or completed), and each epic header shows the breached count, response and resolution percentages and average resolve time. A background scheduler keeps checking.'
  },
  {
    q: 'Who can invite people and change roles?',
    a: 'Workspace Owners and Admins can invite members and change roles. Only an Owner can grant or remove the Owner role or delete the workspace, and a workspace always keeps at least one Owner. Inside a project, the Project Admin manages members, epics and workflow states.'
  },
  {
    q: 'Is the SDK key safe to put in my front-end code?',
    a: 'The SDK key is a public key meant for the browser. Requests are signed and only accepted from the allowed origins you set on the integration. The key is shown once when created, and you can regenerate it at any time.'
  },
  {
    q: 'Can I use Pristine from ChatGPT or Claude Desktop?',
    a: 'Yes. Connect a custom GPT through GPT Actions with OAuth so ChatGPT can read and update your tasks. MCP clients such as Claude Desktop or IDEs can connect to the Model Context Protocol server, which exposes around 74 tools and 4 prompts.'
  },
  {
    q: 'How do I sign in, and is two-factor available?',
    a: 'Sign up with email and password (at least 8 characters) or Continue with Google. Two-factor authentication sends a 6-digit code by email. Codes are hashed, expire and allow a limited number of attempts.'
  }
];

/* ------------------------------------------------------------------ */
/* Small layout helpers                                                */
/* ------------------------------------------------------------------ */

function Section({ id, className, children, labelledBy }: { id?: string; className?: string; children: ReactNode; labelledBy?: string }): JSX.Element {
  return (
    <section aria-labelledby={labelledBy} className={cn('scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24', className)} id={id}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function IconBadge({ icon: Icon, dark = false }: { icon: LucideIcon; dark?: boolean }): JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        'landing-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        dark ? 'bg-white/10 text-emerald-300 ring-1 ring-inset ring-white/10' : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
      )}
    >
      <Icon size={18} />
    </span>
  );
}

function FeatureCard({ icon, title, children, className }: { icon: LucideIcon; title: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={cn('landing-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <IconBadge icon={icon} />
      <h4 className="m-0 mt-4 text-[15px] font-semibold text-slate-900">{title}</h4>
      <div className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

function SubHeading({ eyebrow, title, children, id }: { eyebrow: string; title: string; children?: ReactNode; id?: string }): JSX.Element {
  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm font-medium text-emerald-700">{eyebrow}</p>
      <h3 className="m-0 text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl" id={id}>
        {title}
      </h3>
      {children ? <div className="text-[15px] leading-relaxed text-slate-600">{children}</div> : null}
    </div>
  );
}

function GuideLink({ hash, children, dark = false }: { hash: string; children: ReactNode; dark?: boolean }): JSX.Element {
  return (
    <Link
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2',
        dark ? 'text-emerald-300 focus-visible:ring-emerald-400/50' : 'text-emerald-700 focus-visible:ring-emerald-600/30'
      )}
      to={{ pathname: '/guide', hash }}
    >
      {children} <ArrowRight aria-hidden size={14} />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingPage(): JSX.Element {
  const { user } = useAuth();
  useHashScroll();
  const pageRef = useRef<HTMLDivElement>(null);
  useReveal(pageRef);

  const [aiTab, setAiTab] = useState(AI_TABS[0].id);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeAi = AI_TABS.find((t) => t.id === aiTab) ?? AI_TABS[0];
  const ActiveAiMock = activeAi.mock;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % AI_TABS.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + AI_TABS.length) % AI_TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = AI_TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setAiTab(AI_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const primaryCta = user ? (
    <Link className={ctaClass('primary')} to="/dashboard">
      Open app <ArrowRight size={16} />
    </Link>
  ) : (
    <Link className={ctaClass('primary')} to="/register">
      Get started <ArrowRight size={16} />
    </Link>
  );

  return (
    <div ref={pageRef} className="relative min-h-screen overflow-x-clip bg-white font-sans text-slate-700 selection:bg-emerald-500/15 selection:text-emerald-950">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-md"
        href="#main"
      >
        Skip to content
      </a>
      <MarketingNav />

      <main id="main">
        {/* ------------------------------------------------ Hero */}
        <section aria-labelledby="hero-title" className="relative border-b border-slate-200 bg-slate-50" id="top">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(16,185,129,0.10),transparent),radial-gradient(40%_40%_at_100%_60%,rgba(14,165,233,0.06),transparent)]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="landing-blob absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-300/25 blur-3xl" />
            <div className="landing-blob-slow absolute -right-20 top-40 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="landing-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-300/15 blur-3xl" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20">
            <div className="landing-hero-in mx-auto flex max-w-3xl flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-600 shadow-sm">
                <span aria-hidden className="landing-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Work management and product engagement, together
              </span>
              <h1 className="m-0 mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl" id="hero-title">
                Plan the work. <span className="landing-gradient-text bg-gradient-to-r from-emerald-700 via-teal-500 to-sky-600 bg-clip-text text-transparent">Guide the people</span> who use it.
              </h1>
              <p className="m-0 mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Pristine gives your team projects, epics and tasks with SLAs, self-updating priorities and AI planning, and gives
                your product in-app guides, surveys, checklists and event analytics through a JavaScript SDK. One workspace,
                one login.
              </p>
              <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
                {primaryCta}
                <Link className={ctaClass('secondary')} to="/guide">
                  <BookOpen size={16} /> Read the guide
                </Link>
              </div>
              <ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 text-[13px] text-slate-500">
                {['Continue with Google', 'Bring your own AI model', 'MCP and ChatGPT ready'].map((t) => (
                  <li className="flex items-center gap-1.5" key={t}>
                    <ShieldCheck aria-hidden className="text-emerald-600" size={14} /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-hero-mock relative mx-auto mt-14 max-w-5xl">
              <div className="landing-float">
                <HeroMock />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Works with */}
        <section aria-label="Works with" className="border-b border-slate-200 bg-white py-6">
          <p className="m-0 mb-4 text-center text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Works with the tools you already use</p>
          <div className="landing-marquee overflow-hidden">
            <ul className="landing-marquee-track m-0 flex w-max list-none gap-3 p-0">
              {[...WORKS_WITH, ...WORKS_WITH].map((name, i) => (
                <li
                  aria-hidden={i >= WORKS_WITH.length ? true : undefined}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600"
                  key={`${name}-${i}`}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------ Two products in one */}
        <Section id="products" labelledBy="products-title">
          <SectionHeading
            description="Most teams juggle a task tracker, an onboarding tool, a survey tool and an analytics script. Pristine puts them in one place, with a developer platform underneath."
            eyebrow="Two products in one"
            id="products-title"
            title="Everything from the first task to the first-run experience"
          />
          <div data-reveal-children className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[
              {
                icon: FolderKanban,
                tag: 'For your team',
                title: 'Work management',
                body: 'Plan, prioritise and deliver work together.',
                items: ['Projects, epics and tasks with list and kanban views', 'SLA targets, dynamic priority and daily rollover', 'Comments, approvals, notes, chat and history', 'AI planning with the model you choose'],
                href: 'work'
              },
              {
                icon: Megaphone,
                tag: 'For your users',
                title: 'Product engagement',
                body: 'Onboard, inform and listen to the people using your app.',
                items: ['Guides in five formats, from modals to hotspots', 'Surveys with fourteen question types', 'Checklists, targeting and saved segments', 'Event tracking and engagement analytics'],
                href: 'engagement'
              },
              {
                icon: Code2,
                tag: 'For your developers',
                title: 'Developer platform',
                body: 'Connect Pristine to your code, your tools and your AI assistants.',
                items: ['JavaScript SDK with signed requests', 'Scoped, expiring agent keys', 'ChatGPT Actions and an MCP server', 'Companion devices paired by QR code'],
                href: 'developers'
              }
            ].map((p) => (
              <div className="landing-card flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:last:col-span-2 lg:last:col-span-1" key={p.title}>
                <div className="flex items-center justify-between gap-3">
                  <IconBadge icon={p.icon} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{p.tag}</span>
                </div>
                <h3 className="m-0 mt-5 text-lg font-semibold text-slate-900">{p.title}</h3>
                <p className="m-0 mt-1 text-sm text-slate-600">{p.body}</p>
                <CheckList className="mt-5" items={p.items} />
                <Link
                  className="mt-6 inline-flex w-fit items-center gap-1.5 rounded pt-1 text-sm font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                  to={{ pathname: '/', hash: p.href }}
                >
                  Explore {p.title.toLowerCase()} <ArrowRight aria-hidden size={14} />
                </Link>
              </div>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------ Work management: projects, epics & tasks */}
        <Section className="border-t border-slate-200 bg-slate-50" id="work" labelledBy="work-title">
          <SectionHeading
            description="Organise work into projects and epics, then run it from a list or a board, with a detailed inspector for every task."
            eyebrow="Work management"
            id="work-title"
            title="Projects, epics and tasks, the way your team works"
          />

          <div data-reveal-children className="mt-14 grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <div data-reveal-children className="grid gap-6">
              <SubHeading eyebrow="Plan and organise" title="From project to subtask in one place">
                Every project has epics (Planned, Active, Completed, Archived) that group tasks. Tasks carry a title,
                description, priority, status, assignee, due date and subtasks with their own assignees and notes.
              </SubHeading>
              <CheckList
                items={[
                  'List and kanban views inside every epic',
                  'Search, “Assigned to me” and filters by status, priority and assignee',
                  'Bulk-select tasks and assign them in one go',
                  'Block and unblock tasks with a reason',
                  'Custom workflow states per project'
                ]}
              />
              <GuideLink hash="tasks">Read the tasks guide</GuideLink>
            </div>
            <TaskViewsMock />
          </div>

          <div data-reveal-children className="mt-16 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <InspectorMock />
            <div data-reveal-children className="grid gap-6">
              <SubHeading eyebrow="Task inspector" title="Everything about a task, in one drawer">
                Open any task to see its properties, a subtask checklist with progress, live comments, approvals, work notes
                and timers, without leaving the board.
              </SubHeading>
              <div data-reveal-children className="grid gap-4 sm:grid-cols-2">
                <FeatureCard icon={LayoutList} title="Priorities and statuses">
                  Low, Medium, High and Critical. Backlog, To do, In progress, In review, Blocked and Done.
                </FeatureCard>
                <FeatureCard icon={Workflow} title="Custom workflow states">
                  Shape the workflow per project from the project’s More menu → Workflow states.
                </FeatureCard>
                <FeatureCard icon={ListChecks} title="Subtasks with owners">
                  Break work down; each subtask has its own assignee and notes, and progress rolls up.
                </FeatureCard>
                <FeatureCard icon={Timer} title="Timers and work notes">
                  Track time on a task and keep working notes next to the work itself.
                </FeatureCard>
              </div>
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------ SLAs, dynamic priority, rollover */}
        <Section id="slas" labelledBy="slas-title">
          <div data-reveal-children className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 grid gap-4 lg:order-1">
              <SlaMock />
              <RolloverMock />
            </div>
            <div className="order-1 grid gap-6 lg:order-2">
              <SectionHeading
                align="left"
                description="Set service targets, let priorities keep themselves current, and never lose an unfinished task overnight."
                eyebrow="SLAs and priorities"
                id="slas-title"
                title="Deadlines you can see coming"
              />
              <div className="grid gap-5">
                {[
                  {
                    icon: Timer,
                    title: 'SLA targets and health',
                    body: 'Response and resolution targets per priority, set in Settings → SLA Targets. Each task shows its SLA health: healthy, near breach, breached, paused or completed. Epic headers show the breached count, response %, resolution % and average resolve time. A background scheduler keeps checking.'
                  },
                  {
                    icon: Zap,
                    title: 'Dynamic priority engine',
                    body: 'Priorities are re-scored automatically from due dates, SLA risk and activity, so urgent work rises on its own. Run it on demand with More → Recalculate priorities.'
                  },
                  {
                    icon: History,
                    title: 'Daily rollover',
                    body: 'Unfinished tasks for a day roll over to the next day automatically, on a schedule.'
                  }
                ].map((f) => (
                  <div className="flex gap-4" key={f.title}>
                    <IconBadge icon={f.icon} />
                    <div className="min-w-0">
                      <h3 className="m-0 text-[15px] font-semibold text-slate-900">{f.title}</h3>
                      <p className="m-0 mt-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <GuideLink hash="slas">How to set SLA targets</GuideLink>
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------ Collaboration */}
        <Section className="border-t border-slate-200 bg-slate-50" id="collaboration" labelledBy="collab-title">
          <SectionHeading
            description="Discussion, decisions and history stay attached to the work, and everyone hears about what changed."
            eyebrow="Collaboration"
            id="collab-title"
            title="Work together without switching tools"
          />
          <div data-reveal-children className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <div className="grid content-start gap-4 md:col-span-2 lg:col-span-1 lg:row-span-3">
              <ChatMock />
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <IconBadge icon={MessagesSquare} />
                <h3 className="m-0 mt-4 text-[15px] font-semibold text-slate-900">Real-time project chat</h3>
                <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">
                  A chat panel in every project, live over WebSockets, with members-only threads.
                </p>
              </div>
            </div>
            <FeatureCard icon={MessageCircle} title="Live comments">
              Comment on tasks and see replies appear as they are written.
            </FeatureCard>
            <FeatureCard icon={ClipboardCheck} title="Approvals">
              Request approval on a task, then approve or reject it through the approval workflow.
            </FeatureCard>
            <FeatureCard icon={FileText} title="Notes and documents">
              Project notes, epic notes and task work notes keep context close to the work.
            </FeatureCard>
            <FeatureCard icon={History} title="Activity history">
              An audit trail of project activity, with a retention policy the Project Admin configures.
            </FeatureCard>
            <FeatureCard icon={BellRing} title="Notifications and inbox">
              A bell for task updates and an inbox for invitations and team updates.
            </FeatureCard>
            <FeatureCard icon={Users} title="Project team">
              Add members to a project from the Team panel and set their project role.
            </FeatureCard>
          </div>
        </Section>

        {/* ------------------------------------------------ AI */}
        <Section id="ai" labelledBy="ai-title">
          <SectionHeading
            description="AI that plans projects, breaks down tasks and organises your day, running on the model each project chooses."
            eyebrow="AI"
            id="ai-title"
            title="An AI co-planner, on your terms"
          />

          <div className="mt-10">
            <div aria-label="AI features" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0" role="tablist">
              {AI_TABS.map((t, i) => {
                const selected = t.id === aiTab;
                return (
                  <button
                    aria-controls={`ai-panel-${t.id}`}
                    aria-selected={selected}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/25',
                      selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    )}
                    id={`ai-tab-${t.id}`}
                    key={t.id}
                    onClick={() => setAiTab(t.id)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    tabIndex={selected ? 0 : -1}
                    type="button"
                  >
                    <t.icon aria-hidden size={15} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div
              aria-labelledby={`ai-tab-${activeAi.id}`}
              className="mt-6 grid items-center gap-8 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12"
              id={`ai-panel-${activeAi.id}`}
              role="tabpanel"
            >
              <div data-reveal-children className="grid gap-4">
                <h3 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{activeAi.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-slate-600">{activeAi.body}</p>
                <CheckList items={activeAi.points} />
                <GuideLink hash={activeAi.id === 'prompts' ? 'prompts' : 'ai'}>Learn more in the guide</GuideLink>
              </div>
              <ActiveAiMock />
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------ Product engagement */}
        <section aria-labelledby="engagement-title" className="relative scroll-mt-16 overflow-hidden border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24" id="engagement">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(16,185,129,0.08),transparent)]" />
          <div className="relative mx-auto max-w-6xl">
            <SectionHeading
              description="Install one JavaScript SDK in your app, then onboard, inform and survey your users, all targeted to the right people and measured."
              eyebrow="Product engagement"
              id="engagement-title"
              title="Guide, survey and understand your own users"
            />

            {/* SDK integration + guided setup */}
            <div data-reveal-children className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div data-reveal-children className="grid gap-6">
                <SubHeading eyebrow="SDK integrations" title="Connect each app and environment">
                  Create an integration per app and environment (Development, Staging or Production) with its domain and
                  allowed origins. You get a public SDK key, shown once and regenerable at any time, and you can see
                  connection status, last activity and SDK version.
                </SubHeading>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['Pending', 'bg-amber-50 text-amber-700 ring-amber-200'],
                    ['Connected', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
                    ['Disabled', 'bg-slate-100 text-slate-700 ring-slate-200'],
                    ['Revoked', 'bg-red-50 text-red-700 ring-red-200']
                  ].map(([s, c]) => (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', c)} key={s}>
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> {s}
                    </span>
                  ))}
                </div>
                <CheckList
                  items={[
                    'Guided setup: install, initialise, connect, track a first event, publish a first experience',
                    'Steps tick off automatically as your app connects',
                    'Enable, disable or revoke an integration at any time'
                  ]}
                />
              </div>
              <SetupMock />
            </div>

            {/* Guides */}
            <div className="mt-20">
              <SubHeading eyebrow="Guides" title="Five formats for every moment">
                Start from a template (Welcome message, Product tour, Feature announcement or Feature tip), preview it live,
                set its priority and build steps with headings, body text, buttons and element selectors.
              </SubHeading>
              <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
                {GUIDE_FORMATS.map((g) => (
                  <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" key={g.id}>
                    <GuideFormatIllustration format={g.id} />
                    <h4 className="m-0 mt-3 text-[15px] font-semibold text-slate-900">{g.title}</h4>
                    <p className="m-0 mt-1 text-[13px] leading-relaxed text-slate-600">{g.body}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Surveys */}
            <div data-reveal-children className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div data-reveal-children className="grid gap-4 sm:grid-cols-2 lg:order-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <NpsMock />
                </div>
                <NpsResultsMock />
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[12px] font-medium text-slate-700">Templates</div>
                  <ul className="m-0 mt-2 grid list-none gap-1.5 p-0 text-[13px] text-slate-700">
                    {['NPS', 'Satisfaction (CSAT)', 'Feature feedback', 'Onboarding feedback'].map((t) => (
                      <li className="flex items-center gap-2" key={t}>
                        <Target aria-hidden className="text-slate-400" size={13} /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div data-reveal-children className="grid gap-6 lg:order-1">
                <SubHeading eyebrow="Surveys" title="Ask the right question, in the right format">
                  Build surveys from fourteen question types, start from a template, then read responses and per-question
                  results, including NPS promoters, passives and detractors.
                </SubHeading>
                <ul aria-label="Survey question types" className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {QUESTION_TYPES.map((q) => (
                    <li className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[13px] font-medium text-slate-700 shadow-sm" key={q}>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Checklists, targeting, lifecycle & analytics */}
            <div data-reveal-children className="mt-20 grid gap-6 lg:grid-cols-3">
              <div className="grid content-start gap-4">
                <div>
                  <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                    <ListChecks aria-hidden className="text-emerald-700" size={18} /> Checklists
                  </h3>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">Onboarding checklists with items that guide new users to their first success.</p>
                </div>
                <ChecklistMock />
              </div>
              <div className="grid content-start gap-4">
                <div>
                  <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                    <Radar aria-hidden className="text-emerald-700" size={18} /> Targeting and segments
                  </h3>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">
                    Show an experience to everyone, or to segments defined by page URL, user attributes and events. Save
                    segments and reuse them across guides and surveys.
                  </p>
                </div>
                <SegmentMock />
              </div>
              <div className="grid content-start gap-4">
                <div>
                  <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                    <Rocket aria-hidden className="text-emerald-700" size={18} /> Lifecycle and analytics
                  </h3>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-600">
                    Publish with a confirmation, pause or archive any time, and see views, completions, dismissals and step
                    drop-off for every guide and survey.
                  </p>
                  <div className="mt-3">
                    <LifecycleMock />
                  </div>
                </div>
                <FunnelMock />
              </div>
            </div>
            <div className="mt-10 flex justify-center">
              <GuideLink hash="product-engagement">Step-by-step: set up product engagement</GuideLink>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Event tracking */}
        <Section id="events" labelledBy="events-title">
          <div data-reveal-children className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <div data-reveal-children className="grid gap-6">
              <SectionHeading
                align="left"
                description={
                  <>
                    Everything your app sends with <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">Engagement.track(…)</code> lands
                    in one searchable stream.
                  </>
                }
                eyebrow="Event tracking"
                id="events-title"
                title="See what your users actually do"
              />
              <CheckList
                items={[
                  'Filter events by name and time range',
                  'Inspect any event in the payload viewer',
                  'Engagement analytics: monthly tracked users, top events and NPS',
                  'Use events in targeting rules for segments'
                ]}
              />
              <GuideLink hash="event-tracking">Read the event tracking guide</GuideLink>
            </div>
            <EventsMock />
          </div>
        </Section>

        {/* ------------------------------------------------ Developers */}
        <section aria-labelledby="dev-title" className="relative scroll-mt-16 overflow-hidden bg-slate-900 px-4 py-16 text-white sm:px-6 sm:py-24" id="developers">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_85%_10%,rgba(16,185,129,0.14),transparent)]" />
          <div className="relative mx-auto max-w-6xl">
            <div data-reveal-children className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div data-reveal-children className="grid gap-6">
                <SectionHeading
                  align="left"
                  dark
                  description="Install the SDK, initialise it with your key and start tracking. Requests are signed and only accepted from the integration's allowed origins."
                  eyebrow="Developer platform"
                  id="dev-title"
                  title="A few lines of code to get started"
                />
                <CheckList
                  dark
                  items={[
                    <>
                      <code className="font-mono text-[13px] text-emerald-300">Engagement.init({'{ apiKey, userId }'})</code> once at start-up
                    </>,
                    <>
                      <code className="font-mono text-[13px] text-emerald-300">Engagement.track(name, properties)</code> for anything meaningful
                    </>,
                    'Guides, surveys and checklists appear automatically for matching users'
                  ]}
                />
              </div>
              <CodeBlock code={SDK_SNIPPET} label="app.ts" />
            </div>

            <div data-reveal-children className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: KeyRound, title: 'Agent keys', body: 'A key per tool or script, limited to the scopes and projects it needs, with an expiry. Keys are stored hashed and shown once.' },
                { icon: MessageCircle, title: 'ChatGPT Actions', body: 'Connect a custom GPT through GPT Actions with OAuth so ChatGPT can read and update your tasks.' },
                { icon: Plug, title: 'MCP server', body: 'A Model Context Protocol endpoint with around 74 tools and 4 prompts for clients such as Claude Desktop and IDEs.' },
                { icon: Smartphone, title: 'Companion devices', body: 'Pair a phone or tablet with a one-time key or a QR code, and revoke it any time in Settings → Companion Devices.' }
              ].map((c) => (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5" key={c.title}>
                  <IconBadge dark icon={c.icon} />
                  <h3 className="m-0 mt-4 text-[15px] font-semibold text-white">{c.title}</h3>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-300">{c.body}</p>
                </div>
              ))}
            </div>

            <div data-reveal-children className="mt-6 grid items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:grid-cols-2">
              <div className="grid gap-3">
                <h3 className="m-0 text-lg font-semibold text-white">Manage work from your AI assistant</h3>
                <p className="m-0 text-sm leading-relaxed text-slate-300">
                  MCP clients can list, create and update projects and tasks through Pristine’s MCP server, authenticated with a scoped
                  agent key or your account. Every call is governed and logged. Set it up from Settings → MCP Integration.
                </p>
                <GuideLink dark hash="developer-integrations">Developer integrations guide</GuideLink>
              </div>
              <McpMock />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ Agent governance */}
        <Section className="border-t border-slate-200 bg-slate-50" id="governance" labelledBy="governance-title">
          <SectionHeading
            description="AI agents now act on your work: MCP clients, ChatGPT, scripts with API keys, companion apps and the AI providers behind project AI. See every one, decide what each may do and keep a record."
            eyebrow="Agent governance"
            id="governance-title"
            title="Control every AI agent that touches your work"
          />
          <div data-reveal-children className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <FeatureCard icon={Radar} title="Automatic inventory">
              API keys, MCP clients, ChatGPT Actions, companion devices and AI providers register themselves the first time they act, with an owner, scopes and a last-seen time.
            </FeatureCard>
            <FeatureCard icon={KeyRound} title="Least-privilege keys">
              Give each agent only the scopes and projects it needs, with an expiry. Keys are hashed, shown once and can be rotated in a click.
            </FeatureCard>
            <FeatureCard icon={Workflow} title="Policies and approvals">
              Allow, block or require approval by action, risk, project, agent type or time of day. Start in advisory mode, then enforce.
            </FeatureCard>
            <FeatureCard icon={ShieldCheck} title="Human in the loop">
              Held actions wait in an approvals inbox for a workspace or project admin, then run once, exactly as requested.
            </FeatureCard>
            <FeatureCard icon={History} title="Activity, alerts and undo">
              Every agent action is logged with inputs masked. Alerts flag bulk deletes, spikes and refusals; task and epic changes can be undone.
            </FeatureCard>
            <FeatureCard icon={Lock} title="Kill switch">
              Suspend one agent or stop them all at once. It takes effect on the next call, for keys, sessions and AI providers alike.
            </FeatureCard>
          </div>
          <div data-reveal-children className="mt-6 grid items-center gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:grid-cols-2">
            <div className="grid gap-3">
              <h3 className="m-0 text-lg font-semibold text-slate-900">Risk scores and a compliance report</h3>
              <p className="m-0 text-sm leading-relaxed text-slate-600">
                Each agent gets a risk score with the reasons behind it. The governance report maps your setup to the OWASP Top 10 for LLM
                applications, the NIST AI Risk Management Framework, ISO/IEC 42001 and the EU AI Act, and exports to JSON or CSV.
              </p>
              <GuideLink hash="agent-governance">Agent governance guide</GuideLink>
            </div>
            <CheckList
              items={[
                'Personal data and secrets masked before prompts reach AI providers',
                'Prompt checks for leaked secrets and injection phrases before a canary rollout',
                'AI usage and cost per provider',
                'Activity kept for 90 days, exportable for audits'
              ]}
            />
          </div>
        </Section>

        {/* ------------------------------------------------ Security */}
        <Section id="security" labelledBy="security-title">
          <SectionHeading
            description="Sensible defaults for signing in, staying signed in and keeping keys under control."
            eyebrow="Security and accounts"
            id="security-title"
            title="Secure by default"
          />
          <div data-reveal-children className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            <FeatureCard icon={LogIn} title="Email or Google sign-in">
              Sign up with email and a password of at least 8 characters, or Continue with Google. “Remember me” keeps you signed in.
            </FeatureCard>
            <FeatureCard icon={Fingerprint} title="Two-factor authentication">
              A 6-digit code is emailed at sign-in. Codes are hashed, expire and allow a limited number of attempts.
            </FeatureCard>
            <FeatureCard icon={Mail} title="Password reset by code">
              Reset your password with an emailed one-time code. Resetting signs out your other sessions.
            </FeatureCard>
            <FeatureCard icon={MonitorSmartphone} title="Device sessions">
              Sessions use access and refresh tokens. Sign in elsewhere or revoke sessions when a device is lost.
            </FeatureCard>
            <FeatureCard icon={Lock} title="Signed SDK requests">
              SDK requests are signed and only accepted from the allowed origins you set per integration.
            </FeatureCard>
            <FeatureCard icon={Users} title="Roles and permissions">
              Workspace roles and project roles decide who can administer, manage projects and change tasks.
            </FeatureCard>
          </div>
        </Section>

        {/* ------------------------------------------------ Roles */}
        <Section className="border-t border-slate-200 bg-slate-50" id="roles" labelledBy="roles-title">
          <SectionHeading
            description="Two layers of roles: one for the workspace, one for each project. Task creators and assignees get rights on their own tasks."
            eyebrow="Roles"
            id="roles-title"
            title="The right access for everyone"
          />

          <h3 className="m-0 mt-12 text-[15px] font-semibold text-slate-900">Workspace roles</h3>
          <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { role: 'Owner', body: 'Everything an Admin can do, plus delete the workspace and grant or remove the Owner role.', dark: true },
              { role: 'Admin', body: 'Edits workspace settings, invites members and changes roles (not an Owner’s role).' },
              { role: 'Manager', body: 'Works in the projects they are added to. No workspace administration.' },
              { role: 'Member', body: 'Works in the projects they are added to. No workspace administration.' },
              { role: 'Guest', body: 'For outside collaborators with limited access to the projects they join.' }
            ].map((r) => (
              <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={r.role}>
                <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', r.dark ? 'bg-slate-900 text-white ring-slate-900' : 'bg-slate-50 text-slate-700 ring-slate-200')}>
                  {r.role}
                </span>
                <p className="m-0 mt-3 text-[13px] leading-relaxed text-slate-600">{r.body}</p>
              </li>
            ))}
          </ul>

          <h3 className="m-0 mt-10 text-[15px] font-semibold text-slate-900">Project and task roles</h3>
          <ul className="m-0 mt-4 grid list-none gap-3 p-0 md:grid-cols-3">
            {[
              { icon: ShieldCheck, role: 'Project Admin', body: 'The project’s creator. Manages the project, its members, epics, workflow states and history retention; deletes, assigns and reassigns any task.' },
              { icon: Users, role: 'Project Member', body: 'Sees the project, creates and updates tasks, edits and assigns tasks they created, and takes part in approvals and chat.' },
              { icon: UserPlus, role: 'Task creator and assignee', body: 'Creators can edit, assign and reassign their own task. Assignees can update the tasks assigned to them.' }
            ].map((r) => (
              <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={r.role}>
                <IconBadge icon={r.icon} />
                <div className="min-w-0">
                  <h4 className="m-0 text-[15px] font-semibold text-slate-900">{r.role}</h4>
                  <p className="m-0 mt-1 text-[13px] leading-relaxed text-slate-600">{r.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <GuideLink hash="permissions">See the full permissions matrix</GuideLink>
          </div>
        </Section>

        {/* ------------------------------------------------ How it works */}
        <Section id="how" labelledBy="how-title">
          <SectionHeading eyebrow="How it works" id="how-title" title="From sign-up to your first live guide" />
          <ol className="relative m-0 mt-12 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {[
              { icon: GitBranch, title: 'Create a workspace', body: 'Sign up with email or Google and create a workspace for your team.' },
              { icon: UserPlus, title: 'Invite your team', body: 'Invite people by email and give each a workspace role.' },
              { icon: Sparkles, title: 'Plan with AI', body: 'Describe a project to the AI Planner and approve the plan it proposes.' },
              { icon: Timer, title: 'Track SLAs', body: 'Set SLA targets per priority and watch health and priorities update.' },
              { icon: MousePointerClick, title: 'Engage your users', body: 'Install the SDK, then publish guides, surveys and checklists.' }
            ].map((s, i) => (
              <li className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={s.title}>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{i + 1}</span>
                  <s.icon aria-hidden className="text-slate-400" size={18} />
                </div>
                <h3 className="m-0 mt-4 text-[15px] font-semibold text-slate-900">{s.title}</h3>
                <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex justify-center">
            <GuideLink hash="getting-started">Follow the getting started guide</GuideLink>
          </div>
        </Section>

        {/* ------------------------------------------------ FAQ */}
        <Section className="border-t border-slate-200 bg-slate-50" id="faq" labelledBy="faq-title">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" id="faq-title" title="Frequently asked questions" />
            <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {FAQS.map((f) => (
                <details className="group" key={f.q}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/20 sm:px-5 sm:text-[15px] [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">{f.q}</span>
                    <ChevronDown aria-hidden className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" size={16} />
                  </summary>
                  <p className="m-0 px-4 pb-4 text-sm leading-relaxed text-slate-600 sm:px-5">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="m-0 mt-6 text-center text-sm text-slate-600">
              More answers in the{' '}
              <Link className="font-medium text-emerald-700 underline-offset-4 hover:underline" to={{ pathname: '/guide', hash: 'troubleshooting' }}>
                troubleshooting guide
              </Link>
              .
            </p>
          </div>
        </Section>

        {/* ------------------------------------------------ Closing CTA */}
        <section aria-labelledby="cta-title" className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="landing-sheen relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-10" data-reveal>
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_0%,rgba(16,185,129,0.22),transparent)]" />
            <div aria-hidden className="landing-blob pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="m-0 text-2xl font-semibold tracking-tight text-white sm:text-3xl" id="cta-title">
                  Bring your work and your users into one place
                </h2>
                <p className="m-0 mt-2 text-[15px] text-slate-300">Create a workspace, plan your first project with AI, and ship your first guide.</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                {user ? (
                  <Link className={ctaClass('accent')} to="/dashboard">
                    Open app <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link className={ctaClass('accent')} to="/register">
                    Get started <ArrowRight size={16} />
                  </Link>
                )}
                <Link
                  className={ctaClass('secondary', '!border-white/15 !bg-white/5 !text-white hover:!bg-white/10')}
                  to="/guide"
                >
                  <BookOpen size={15} /> Read the guide
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
