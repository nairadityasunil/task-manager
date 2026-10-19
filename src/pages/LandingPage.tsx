import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  LockKeyhole,
  Menu,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import logoImg from '@/assets/logo.png';
import { buttonClass } from '@/components/ui';

export default function LandingPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Scroll detection for the navbar background
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Interactive Calculator State
  const [basePriority, setBasePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [slaUrgency, setSlaUrgency] = useState<'NORMAL' | 'NEAR_BREACH' | 'BREACHED'>('NORMAL');
  const [downstreamTasks, setDownstreamTasks] = useState<number>(3);
  const [impact, setImpact] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Ledger validation state
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const triggerLedgerScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 1200);
  };

  // Semantic Search Simulation State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMatches, setSearchMatches] = useState<Array<{ title: string; score: number; status: string; priority: string }>>([]);

  const presetQueries = [
    { query: "auth latency problems", results: [
      { title: "Optimize Redis Access Token Cache Store", score: 0.94, status: "IN_PROGRESS", priority: "CRITICAL" },
      { title: "Review Axios Interceptor Request Queue Delay", score: 0.88, status: "BACKLOG", priority: "HIGH" },
      { title: "Toggle 2FA Code Delivery Gateway Timeout", score: 0.81, status: "BLOCKED", priority: "HIGH" }
    ]},
    { query: "sla resolution breach warnings", results: [
      { title: "Escalate Legal Hold Deletion Override request", score: 0.96, status: "PENDING_APPROVAL", priority: "CRITICAL" },
      { title: "Audit Downstream Blocked Tasks on Database Layer", score: 0.89, status: "IN_PROGRESS", priority: "HIGH" },
      { title: "Check Task Inspector Calculation Offset logs", score: 0.83, status: "COMPLETED", priority: "MEDIUM" }
    ]},
    { query: "cryptographic verification logs", results: [
      { title: "Verify SHA-256 Ledger Chain Integrity Verification", score: 0.98, status: "COMPLETED", priority: "MEDIUM" },
      { title: "Lock Project Record Retention legal hold logs", score: 0.85, status: "IN_PROGRESS", priority: "HIGH" }
    ]}
  ];

  const handleQueryClick = (queryText: string) => {
    setSearchQuery(queryText);
    setIsSearching(true);
    const matched = presetQueries.find(q => q.query === queryText)?.results ?? [];
    setTimeout(() => {
      setSearchMatches(matched);
      setIsSearching(false);
    }, 450);
  };

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Interactive Calculator Logic matching backend formulas
  const calculateScore = () => {
    let score = 0;
    const baseMap = { LOW: 10, MEDIUM: 30, HIGH: 60, CRITICAL: 90 };
    score += baseMap[basePriority];
    if (slaUrgency === 'NEAR_BREACH') score += 20;
    else if (slaUrgency === 'BREACHED') score += 40;
    score += downstreamTasks * 15;
    const impactMap = { LOW: 5, MEDIUM: 15, HIGH: 30 };
    score += impactMap[impact];
    return Math.min(score, 200);
  };

  const score = calculateScore();
  const getPriorityLabel = (s: number) => {
    if (s < 40) return { label: 'LOW', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', darkColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20', led: 'bg-emerald-400' };
    if (s < 90) return { label: 'MEDIUM', color: 'text-amber-700 bg-amber-50 border-amber-200', darkColor: 'text-amber-300 bg-amber-500/10 border-amber-400/20', led: 'bg-amber-400' };
    if (s < 140) return { label: 'HIGH', color: 'text-orange-700 bg-orange-50 border-orange-200', darkColor: 'text-orange-300 bg-orange-500/10 border-orange-400/20', led: 'bg-orange-400' };
    return { label: 'CRITICAL', color: 'text-rose-700 bg-rose-50 border-rose-200', darkColor: 'text-red-300 bg-red-500/10 border-red-400/20', led: 'bg-red-400' };
  };

  const priorityResult = getPriorityLabel(score);

  const getExecutionLogs = () => {
    return [
      { prefix: '[GATEWAY]', text: 'Ingested evaluation trigger payload...', color: 'text-sky-400' },
      { prefix: '[ENGINE]', text: `Evaluated base priority: ${basePriority} (${basePriority === 'LOW' ? 10 : basePriority === 'MEDIUM' ? 30 : basePriority === 'HIGH' ? 60 : 90} pts)`, color: 'text-emerald-400' },
      { prefix: '[SLA_MONITOR]', text: `SLA Urgency offset: ${slaUrgency} (${slaUrgency === 'NEAR_BREACH' ? '+20' : slaUrgency === 'BREACHED' ? '+40' : '+0'} pts)`, color: 'text-amber-400' },
      { prefix: '[CASCADE]', text: `Processed ${downstreamTasks} downstream blocked tasks (${downstreamTasks * 15} pts)`, color: 'text-violet-400' },
      { prefix: '[IMPACT]', text: `Analyzed organizational weight: ${impact} (${impact === 'LOW' ? 5 : impact === 'MEDIUM' ? 15 : 30} pts)`, color: 'text-teal-400' },
      { prefix: '[LEDGER]', text: `Dynamic Priority compiled successfully: ${score} / 200`, color: 'text-emerald-300 font-semibold' }
    ];
  };

  const faqs = [
    {
      q: "How does the Dynamic Priority Engine compute priority scores?",
      a: "The engine uses a rigorous additive-multiplier model. It takes a Task's Base Priority (10-90 severity points), checks for near/breached SLAs to append latency penalties (+20/40 points), adds downstream dependency block counts (15 points per blocked task), and factors in overall organizational impact (5-30 points) to compile a final capped priority value of 0-200."
    },
    {
      q: "What makes the Activity History cryptographically secure?",
      a: "Every transaction, update, or change logs directly as a sequential node block. The system computes a unique SHA-256 hash using the previous block's hash, current sequence, timestamps, and active user details. Administrators can trigger a complete integrity verification in the frontend toolbar to validate hashes in milliseconds and detect unauthorized changes."
    },
    {
      q: "How are SLAs paused and monitored?",
      a: "The portal monitors response and resolution due times. Whenever a task is marked as blocked or pending external ordered approvals, the SLA timer is safely suspended to preserve operational compliance. The timeline automatically resumes once downstream bottlenecks resolve."
    },
    {
      q: "How does Vector AI Semantic Intelligence function without keyword queries?",
      a: "Our system generates high-dimensional mathematical vector embeddings of tasks and epic notes. When you conceptually search for a task (e.g. 'user credentials latency'), the model performs a cosine similarity analysis to surface contextually related tasks and suggested projects, even if they share zero keyword matches."
    }
  ];

  const navLinks = [
    { href: '#demo', label: 'Simulator' },
    { href: '#features', label: 'Features' },
    { href: '#semantic-ai', label: 'Semantic AI' },
    { href: '#matrix', label: 'Compare' },
    { href: '#governance', label: 'Governance' },
    { href: '#faq', label: 'FAQ' }
  ];

  const optionBtn = (active: boolean): string =>
    `h-9 rounded-lg border px-2 text-[13px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 ${
      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
    }`;

  const comparisonRows = [
    ['Task priority', 'Static dropdown', 'Dynamic score (0–200) from SLA urgency, impact and dependency chain'],
    ['Activity log', 'Plain database logs', 'SHA-256 hash chain with on-demand verification'],
    ['SLA tracking', 'Basic due dates', 'Response and resolution timers that pause while blocked'],
    ['Search and AI', 'Keyword search', 'Vector similarity, cross-project suggestions and note matching']
  ] as const;

  const getStarted = () => navigate(user ? '/dashboard' : '/register');

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-slate-700 selection:bg-emerald-500/15 selection:text-emerald-950">
      {/* Navbar */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
          isScrolled || menuOpen ? 'border-slate-200 bg-white/90 backdrop-blur-md' : 'border-transparent bg-white/0'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a className="flex items-center gap-2" href="#top">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
              <img alt="Pristine Logo" className="h-full w-full object-contain" src={logoImg} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Pristine</span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <button className={buttonClass('primary', 'md')} onClick={() => navigate('/dashboard')} type="button">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Launch Portal
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button className={buttonClass('ghost', 'md')} onClick={() => navigate('/login')} type="button">
                  Log In
                </button>
                <button className={buttonClass('primary', 'md')} onClick={() => navigate('/register')} type="button">
                  Register
                </button>
              </>
            )}
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className={buttonClass('ghost', 'icon', 'lg:hidden')}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-sm lg:hidden">
            <nav className="grid">
              {navLinks.map((link) => (
                <a
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  href={link.href}
                  key={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      {/* Hero */}
      <section className="relative border-b border-slate-200 bg-slate-50" id="top">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.08),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-36">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex max-w-3xl flex-col items-center text-center"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Task management with live priorities
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Operational control for <span className="text-emerald-700">high-performance teams</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Pristine brings task coordination, automatic priority scoring, SLA tracking, a tamper-evident activity log and
              semantic search together in one calm workspace.
            </p>
            <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
              <button className={largeButton('primary')} onClick={getStarted} type="button">
                Get Started Free <ChevronRight size={16} />
              </button>
              <a className={largeButton('secondary')} href="#demo">
                Open the simulator
              </a>
            </div>
          </motion.div>

          {/* Key metrics */}
          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { label: 'Activity log integrity', value: '100% verified', accent: true },
              { label: 'Priority calculation', value: '< 0.1 ms' },
              { label: 'SLA compliance', value: '99.98% met' }
            ].map((m) => (
              <div className="px-5 py-4 text-center" key={m.label}>
                <dt className="text-[13px] text-slate-500">{m.label}</dt>
                <dd className={`m-0 mt-1 text-xl font-semibold tracking-tight ${m.accent ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Simulator */}
      <section className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" id="demo">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            description="Change the inputs and watch the score update, using the same formula the backend runs."
            eyebrow="Interactive engine"
            title="See the priority engine in action"
          />

          <div className="mt-10 grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-2 lg:gap-8 lg:p-8">
            {/* Controls */}
            <div className="grid content-start gap-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Calculator size={16} />
                </span>
                <h3 className="m-0 text-[15px] font-semibold text-slate-900">Simulate a task</h3>
              </div>

              <fieldset className="m-0 grid gap-2 border-0 p-0">
                <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Zap className="text-slate-400" size={14} /> Base priority
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
                    <button className={optionBtn(basePriority === p)} key={p} onClick={() => setBasePriority(p)} type="button">
                      {toLabel(p)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="m-0 grid gap-2 border-0 p-0">
                <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Clock className="text-slate-400" size={14} /> SLA urgency
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'NEAR_BREACH', 'BREACHED'] as const).map((u) => (
                    <button className={optionBtn(slaUrgency === u)} key={u} onClick={() => setSlaUrgency(u)} type="button">
                      {toLabel(u)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="m-0 grid gap-2 border-0 p-0">
                <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <Users className="text-slate-400" size={14} /> Impact
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((i) => (
                    <button className={optionBtn(impact === i)} key={i} onClick={() => setImpact(i)} type="button">
                      {toLabel(i)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="grid gap-3">
                <span className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Blocked downstream tasks</span>
                  <span className="tabular-nums text-slate-900">{downstreamTasks}</span>
                </span>
                <input
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900"
                  max="8"
                  min="0"
                  onChange={(e) => setDownstreamTasks(parseInt(e.target.value))}
                  type="range"
                  value={downstreamTasks}
                />
              </label>
            </div>

            {/* Result */}
            <div className="flex min-w-0 flex-col justify-between gap-6 rounded-xl bg-slate-900 p-5 text-white sm:p-6">
              <div className="grid gap-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[13px] text-slate-400">
                  <span>Calculation result</span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <TrendingUp size={14} /> Live
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-baseline text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl">
                      {score}
                      <span className="ml-1.5 text-sm font-normal text-slate-500">/ 200</span>
                    </div>
                    <p className="m-0 mt-1 text-[13px] text-slate-400">Dynamic priority score</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityResult.darkColor}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${priorityResult.led}`} />
                    {toLabel(priorityResult.label)}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(score / 200) * 100}%` }}
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3.5 font-mono text-xs leading-relaxed">
                  <div className="mb-2 flex items-center gap-1.5 border-b border-white/5 pb-2 font-sans text-slate-500">
                    <Terminal size={12} /> Engine log
                  </div>
                  <div className="grid gap-1">
                    {getExecutionLogs()
                      .slice(-3)
                      .map((log, i) => (
                        <div className="flex min-w-0 gap-2" key={i}>
                          <span className="shrink-0 text-slate-500">{log.prefix}</span>
                          <span className="min-w-0 break-words text-slate-300">{log.text}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <button className={buttonClass('accent', 'md', 'w-full').replace('h-9', 'h-10')} onClick={() => navigate('/register')} type="button">
                Deploy the engine <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="scroll-mt-20 border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24" id="features">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            description="Everything a delivery team needs to decide what matters next, and prove what happened."
            eyebrow="Platform features"
            title="Built for teams that ship"
          />

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[
              {
                Icon: Zap,
                title: 'Dynamic priority engine',
                body: 'Task priority is recalculated in real time from base severity, organisational impact, SLA urgency and the number of downstream tasks it blocks.',
                wide: true
              },
              {
                Icon: Clock,
                title: 'SLA breach tracking',
                body: 'Separate timers for first response and resolution. Timers pause automatically while a task is blocked.'
              },
              {
                Icon: ShieldCheck,
                title: 'Tamper-evident activity log',
                body: 'Every project operation is chained with a SHA-256 hash, so edits to history are detected instantly.'
              },
              {
                Icon: Sparkles,
                title: 'Semantic AI search',
                body: 'Vector embeddings let you search tasks by meaning, surface related work across projects and match notes automatically.',
                wide: true
              }
            ].map(({ Icon, title, body, wide }) => (
              <div
                className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${wide ? 'lg:col-span-2' : ''}`}
                key={title}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Icon size={18} />
                </span>
                <h3 className="m-0 mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Semantic sandbox */}
      <section className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24" id="semantic-ai">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            description="Pick a query. Results match on meaning, even when no keywords overlap."
            eyebrow="Semantic sandbox"
            title="Try conceptual search"
          />

          <div className="mt-10 grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-3">
            <div className="grid content-start gap-3 lg:border-r lg:border-slate-200 lg:pr-6">
              <h4 className="m-0 text-sm font-medium text-slate-700">Choose a query</h4>
              <div className="grid gap-2">
                {presetQueries.map((q, idx) => (
                  <button
                    className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      searchQuery === q.query
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                    key={idx}
                    onClick={() => handleQueryClick(q.query)}
                    type="button"
                  >
                    <span className="min-w-0">"{q.query}"</span>
                    <Search className={searchQuery === q.query ? 'text-emerald-600' : 'text-slate-400'} size={14} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid min-w-0 content-start gap-3 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="m-0 text-sm font-medium text-slate-700">Matched tasks</h4>
                <span className="text-xs text-slate-500">Similarity above 0.80</span>
              </div>

              {isSearching ? (
                <div className="grid gap-2">
                  {[0, 1, 2].map((i) => (
                    <div className="h-[62px] animate-pulse rounded-lg bg-slate-100" key={i} />
                  ))}
                </div>
              ) : searchMatches.length > 0 ? (
                <div className="grid gap-2">
                  {searchMatches.map((m, i) => (
                    <div
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                      key={i}
                    >
                      <div className="min-w-0">
                        <span className="text-xs text-slate-500">{toLabel(m.status)}</span>
                        <h5 className="m-0 text-sm font-medium text-slate-900">{m.title}</h5>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          {(m.score * 100).toFixed(0)}% match
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                          {toLabel(m.priority)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-center">
                  <Search className="text-slate-400" size={18} />
                  <p className="m-0 text-sm text-slate-500">Choose a query to see matching tasks.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison matrix */}
      <section className="scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24" id="matrix">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Compare" title="Pristine vs. legacy task managers" />

          {/* Phones: one card per capability */}
          <ul className="m-0 mt-10 grid list-none gap-3 p-0 sm:hidden">
            {comparisonRows.map(([cap, legacy, pristine]) => (
              <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={cap}>
                <h3 className="m-0 text-[15px] font-semibold text-slate-900">{cap}</h3>
                <p className="m-0 mt-2 flex items-start gap-2 text-sm text-slate-800">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                  {pristine}
                </p>
                <p className="m-0 mt-1.5 pl-6 text-[13px] text-slate-500">Standard tools: {legacy}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Capability</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Standard task tool</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-emerald-700">Pristine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map(([cap, legacy, pristine]) => (
                  <tr key={cap}>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{cap}</td>
                    <td className="px-4 py-3.5 text-slate-500">{legacy}</td>
                    <td className="px-4 py-3.5 text-slate-800">
                      <span className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                        {pristine}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Governance */}
      <section className="scroll-mt-16 bg-slate-900 px-4 py-16 text-white sm:px-6 sm:py-24" id="governance">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="grid gap-4">
            <span className="text-sm font-medium text-emerald-400">Compliance first</span>
            <h2 className="m-0 text-2xl font-semibold tracking-tight sm:text-3xl">Security and activity governance</h2>
            <p className="m-0 max-w-lg text-[15px] leading-relaxed text-slate-400">
              Every sign-off, settings change and task update is written to an append-only audit chain. Administrators can
              confirm the full history is intact in seconds.
            </p>
            <ul className="m-0 mt-2 grid list-none gap-2.5 p-0 text-sm text-slate-300">
              {['Hash-chained activity history', 'Legal retention holds', 'One-click integrity verification'].map((item) => (
                <li className="flex items-center gap-2.5" key={item}>
                  <CheckCircle2 className="shrink-0 text-emerald-400" size={16} /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative grid min-w-0 gap-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <span className="flex items-center gap-2 text-[13px] font-medium text-slate-300">
                <span className={`h-1.5 w-1.5 rounded-full ${isScanning ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
                {isScanning ? 'Validating ledger…' : 'Ledger integrity signed'}
              </span>
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                disabled={isScanning}
                onClick={triggerLedgerScan}
                type="button"
              >
                {isScanning ? <Lock className="animate-spin" size={14} /> : <LockKeyhole size={14} />}
                Verify
              </button>
            </div>

            {[
              { label: 'Genesis block #001', seq: 'Seq 1 · create_project', hash: '8a7f…d49e' },
              { label: 'Block #002', seq: 'Seq 2 · evaluate_priority', hash: '3c9b…81ea' }
            ].map((b) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-slate-900 p-3.5"
                key={b.label}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-white">{b.label}</div>
                  <div className="truncate font-mono text-xs text-slate-400">{b.seq}</div>
                </div>
                <code className="shrink-0 font-mono text-xs text-slate-500">{b.hash}</code>
              </div>
            ))}

            {scanComplete && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/95 p-6 text-center">
                <CheckCircle2 className="text-emerald-400" size={28} />
                <h3 className="m-0 text-sm font-semibold text-white">Integrity verification OK</h3>
                <p className="m-0 max-w-sm text-xs text-slate-400">SHA-256 hashes verified. No alterations detected in the ledger.</p>
                <button
                  className={buttonClass('secondary', 'sm', 'mt-2')}
                  onClick={() => setScanComplete(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Workflow" title="How work flows through Pristine" />

          <ol className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3 lg:gap-6">
            {[
              {
                Icon: Server,
                title: 'Capture',
                body: 'Task creation, subtask updates and notes reach the server instantly over secure WebSocket streams.'
              },
              {
                Icon: Calculator,
                title: 'Prioritise',
                body: 'The priority engine rescores work from its base settings, live SLA timers and blocked downstream tasks.'
              },
              {
                Icon: ShieldCheck,
                title: 'Record',
                body: 'The change is committed to the activity log with a sequence number and a hash linked to the previous entry.'
              }
            ].map(({ Icon, title, body }, i) => (
              <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={title}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-medium text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="m-0 mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="scroll-mt-20 border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 sm:py-24" id="faq">
        <div className="mx-auto max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />

          <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {faqs.map((faq, idx) => (
              <div key={idx}>
                <button
                  aria-expanded={activeFaq === idx}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 sm:px-5 sm:text-[15px] cursor-pointer"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  type="button"
                >
                  <span className="min-w-0">{faq.q}</span>
                  <ChevronDown
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180' : ''}`}
                    size={16}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      animate={{ height: 'auto' }}
                      className="overflow-hidden"
                      exit={{ height: 0 }}
                      initial={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="m-0 px-4 pb-4 text-sm leading-relaxed text-slate-600 sm:px-5">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-slate-900 p-6 sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="m-0 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ready to bring order to your work?</h2>
            <p className="m-0 mt-2 text-[15px] text-slate-400">Set up your first project in minutes.</p>
          </div>
          <button className={largeButton('accent')} onClick={getStarted} type="button">
            Get started <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 pb-8 pt-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 grid content-start gap-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <img alt="Pristine Logo" className="h-5 w-5 object-contain" src={logoImg} />
                <span className="text-[15px] font-semibold tracking-tight text-slate-900">Pristine</span>
              </div>
              <p className="m-0 max-w-xs text-[13px] leading-relaxed text-slate-500">
                Task intelligence, SLA timelines and a tamper-evident activity log for delivery teams.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: [
                  { href: '#features', label: 'Dynamic priority' },
                  { href: '#features', label: 'SLA tracking' }
                ]
              },
              {
                title: 'Security',
                links: [
                  { href: '#governance', label: 'Activity hash chain' },
                  { href: '#governance', label: 'Legal retention holds' }
                ]
              },
              {
                title: 'Resources',
                links: [
                  { href: '/sdk-docs', label: 'Developer SDK docs', external: true },
                  { href: '#matrix', label: 'Comparison' }
                ]
              }
            ].map((col) => (
              <div className="grid content-start gap-3" key={col.title}>
                <h4 className="m-0 text-sm font-medium text-slate-900">{col.title}</h4>
                <ul className="m-0 grid list-none gap-2 p-0 text-[13px] text-slate-500">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a className="inline-flex items-center gap-1 transition-colors hover:text-slate-900" href={link.href}>
                        {link.label}
                        {'external' in link ? <ArrowUpRight size={12} /> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} Pristine Inc. All rights reserved.</span>
            <div className="flex items-center gap-5">
              <a className="transition-colors hover:text-slate-900" href="#">
                Security policy
              </a>
              <a className="transition-colors hover:text-slate-900" href="#">
                Terms of service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** A 44px call-to-action button. */
function largeButton(variant: 'primary' | 'secondary' | 'accent'): string {
  return buttonClass(variant, 'md').replace('h-9 px-3.5 text-sm', 'h-11 px-5 text-[15px]');
}

/** Small centred heading used by each landing section. */
function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-sm font-medium text-emerald-700">{eyebrow}</span>
      <h2 className="m-0 mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {description ? <p className="m-0 mt-3 text-[15px] leading-relaxed text-slate-600">{description}</p> : null}
    </div>
  );
}

/** Turns enum values such as NEAR_BREACH into "Near breach". */
function toLabel(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
