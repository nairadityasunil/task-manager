import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';

import { useToast } from '@/context/ToastContext';
import { buttonClass, cn } from '@/components/ui';

const INSTALL_SNIPPET = 'npm install @pristineai/integration-sdk';

const QUICK_START_SNIPPET = "import { initTracker } from '@pristineai/integration-sdk';\n\nconst tracker = initTracker({\n  apiKey: 'your_api_key_here',\n  autoPage: true,\n  debug: false\n});\n\nawait tracker.track('signup_started', {\n  plan: 'pro',\n  source: 'landing-page'\n});";

const ERROR_HANDLING_SNIPPET = "import {\n  initTracker,\n  normalizeSdkError,\n  SDKValidationError\n} from '@pristineai/integration-sdk';\n\ntry {\n  const tracker = initTracker({ apiKey: 'your_api_key_here' });\n  await tracker.track('checkout_completed', { amount: 199 });\n} catch (error) {\n  const normalized = normalizeSdkError(error);\n  console.error(normalized.code, normalized.message);\n\n  if (error instanceof SDKValidationError) {\n    // show friendly validation feedback\n  }\n}";

const ENGAGEMENT_SNIPPET = "import { Engagement } from '@pristineai/integration-sdk';\n\n// Initialize the Engagement Runtime\nEngagement.init({\n  apiKey: 'your_api_key_here',\n  userId: 'user_123',\n  debug: false\n});\n\n// Trigger a custom event (evaluated immediately for checklist/tour triggers)\nawait Engagement.track('user_onboarded_step1');\n\n// Fetch/refresh eligible flows manually (usually handled automatically on SPA routes)\nawait Engagement.refresh();";

const SECTIONS = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'engagement-runtime', label: 'Engagement engine' },
  { id: 'functions', label: 'Function reference' },
  { id: 'examples', label: 'Examples' },
  { id: 'errors', label: 'Errors' }
];

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }): JSX.Element {
  return (
    <div className="grid gap-1">
      {eyebrow && <p className="m-0 text-[13px] font-medium text-slate-500">{eyebrow}</p>}
      <h2 className="m-0 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
      {description && <p className="m-0 text-sm leading-6 text-slate-600">{description}</p>}
    </div>
  );
}

function SdkDocsPanel(): JSX.Element {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const handleCopy = async (text: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast({ variant: 'success', message: 'Code copied.' });
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
  };

  const jumpTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
    event.preventDefault();
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionCls = 'grid scroll-mt-16 gap-4 border-t border-slate-200 pt-6';

  return (
    <div className="mx-auto w-full max-w-[1160px] px-1 py-2 sm:px-3 lg:py-4">
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        {/* Section nav: sticky sidebar on desktop, scrollable chips on phones */}
        <nav aria-label="On this page" className="mb-4 lg:mb-0">
          <div className="lg:sticky lg:top-4">
            <p className="m-0 mb-2 hidden text-xs font-medium text-slate-500 lg:block">On this page</p>
            <ul className="hide-scrollbar m-0 flex list-none gap-1.5 overflow-x-auto p-0 lg:flex-col lg:gap-0.5 lg:overflow-visible">
              {SECTIONS.map((section) => (
                <li className="shrink-0" key={section.id}>
                  <a
                    className={cn(
                      'flex h-8 items-center whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors lg:rounded-lg lg:border-0 lg:px-2.5',
                      activeSection === section.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 lg:bg-white lg:text-slate-900 lg:shadow-sm lg:ring-1 lg:ring-slate-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 lg:bg-transparent lg:hover:bg-slate-100'
                    )}
                    href={`#${section.id}`}
                    onClick={(event) => jumpTo(event, section.id)}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="grid min-w-0 max-w-[920px] gap-6 rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Events SDK Documentation</h1>
              <p className="m-0 mt-1.5 text-sm leading-6 text-slate-600">
                Production-ready guide for installation, initialization, public API, and validation utilities.
              </p>
            </div>
            <a
              className={buttonClass('secondary', 'md')}
              href="https://www.npmjs.com/package/@pristineai/integration-sdk"
              rel="noreferrer"
              target="_blank"
            >
              Package
              <ExternalLink size={15} />
            </a>
          </header>

          <section className={sectionCls} id="getting-started">
            <SectionHeading eyebrow="Getting Started" title="Install, initialize, ship events" />
            <ol className="m-0 grid list-none gap-6 p-0">
              <li className="flex gap-3">
                <StepNumber n={1} />
                <div className="grid min-w-0 flex-1 gap-3">
                  <div>
                    <h3 className="m-0 text-[15px] font-semibold text-slate-900">Install package</h3>
                    <p className="m-0 mt-1 text-sm leading-6 text-slate-600">
                      Use npm in your frontend app. SDK ships browser-focused tracking APIs.
                    </p>
                  </div>
                  <CodePanel copiedId={copiedId} id="install" onCopy={handleCopy} title="Installation">
                    {INSTALL_SNIPPET}
                  </CodePanel>
                </div>
              </li>
              <li className="flex gap-3">
                <StepNumber n={2} />
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-[15px] font-semibold text-slate-900">Create API key</h3>
                  <p className="m-0 mt-1 text-sm leading-6 text-slate-600">
                    Open Event Tracking in app, provision a node, copy secret key once, then store it in your app config.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <StepNumber n={3} />
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-[15px] font-semibold text-slate-900">Initialize once</h3>
                  <p className="m-0 mt-1 text-sm leading-6 text-slate-600">
                    Call <InlineCode>initTracker()</InlineCode> or <InlineCode>Engagement.init()</InlineCode> once at app bootstrap.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className={sectionCls} id="quick-start">
            <SectionHeading title="Quick Start" description="Copy-paste setup for most browser apps." />
            <CodePanel copiedId={copiedId} id="quick-start-code" onCopy={handleCopy} title="Quick Start Example">
              {QUICK_START_SNIPPET}
            </CodePanel>
          </section>

          <section className={sectionCls} id="engagement-runtime">
            <SectionHeading
              title="In-App Engagement Engine"
              description="Automatically deliver Modals, Banners, NPS Surveys, Checklist onboarding widgets and Tours directly to targeted users."
            />
            <CodePanel copiedId={copiedId} id="engagement-code" onCopy={handleCopy} title="Engagement Runtime Example">
              {ENGAGEMENT_SNIPPET}
            </CodePanel>
          </section>

          <section className={sectionCls} id="functions">
            <SectionHeading title="Function Reference" description="Full public API coverage." />
          </section>

          <section className={sectionCls} id="examples">
            <SectionHeading title="Real-World Examples" description="Practical patterns you can drop into app code." />
            <div className="grid gap-4">
              <CodePanel copiedId={copiedId} id="example-onboarding" onCopy={handleCopy} title="Onboarding Flow">
                {"const tracker = initTracker({\n  apiKey: 'live_1234567890abcdef',\n  autoPage: true\n});\n\nawait tracker.identify('user_42', {\n  role: 'owner',\n  workspace: 'northstar'\n});\n\nawait tracker.track('workspace_created', {\n  template: 'product-ops'\n});\n\nawait tracker.flush();"}
              </CodePanel>
              <CodePanel copiedId={copiedId} id="example-auth" onCopy={handleCopy} title="Anonymous to Authenticated">
                {"const tracker = initTracker({ apiKey: 'live_1234567890abcdef' });\n\nawait tracker.track('pricing_viewed', {\n  source: 'landing'\n});\n\nawait tracker.alias('anon_browser_id', 'user_42');\nawait tracker.identify('user_42', {\n  email: 'ada@example.com'\n});\n\nawait tracker.trackWithUser('user_42', 'checkout_completed', {\n  amount: 199,\n  currency: 'USD'\n});"}
              </CodePanel>
            </div>
          </section>

          <section className={sectionCls} id="errors">
            <SectionHeading title="Common Errors and Solutions" description="Use normalized errors in UI and logs." />
            <CodePanel copiedId={copiedId} id="error-snippet" onCopy={handleCopy} title="Error Handling">
              {ERROR_HANDLING_SNIPPET}
            </CodePanel>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-4">Error</th>
                    <th className="border-b border-slate-200 px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-4">Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['API_KEY_REQUIRED', 'Pass non-empty apiKey to initTracker().'],
                    ['API_KEY_INVALID', 'Use real node key from Event Tracking page.'],
                    ['PAYLOAD_INVALID', 'Send plain object to validatePayload().'],
                    ['Event payload too large', 'Reduce nested payload size or split event shape.'],
                    ['Tracker not initialized', 'Call initTracker() before getTracker().'],
                  ].map(([code, fix]) => (
                    <tr className="border-b border-slate-100 align-top last:border-0" key={code}>
                      <td className="px-3 py-3 sm:px-4">
                        <code className="break-words font-mono text-[13px] font-medium text-slate-900">{code}</code>
                      </td>
                      <td className="px-3 py-3 text-[13px] leading-6 text-slate-600 sm:px-4">{fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: number }): JSX.Element {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
      {n}
    </span>
  );
}

function InlineCode({ children }: { children: React.ReactNode }): JSX.Element {
  return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">{children}</code>;
}

function CodePanel({
  title,
  children,
  id,
  copiedId,
  onCopy
}: {
  title: string;
  children: string;
  id: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => Promise<void>;
}): JSX.Element {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 pl-4 pr-1.5">
        <span className="truncate text-xs font-medium text-slate-400">{title}</span>
        <button
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => void onCopy(children, id)}
          type="button"
        >
          {copiedId === id ? <Check size={13} /> : <Copy size={13} />}
          {copiedId === id ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="custom-scrollbar m-0 overflow-x-auto p-4 font-mono text-[13px] leading-6 text-slate-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default SdkDocsPanel;
