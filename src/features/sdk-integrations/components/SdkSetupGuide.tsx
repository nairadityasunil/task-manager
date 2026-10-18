import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, RefreshCw } from 'lucide-react';

import { listGuides, listSurveys } from '@/lib/engagement/api';
import type { SdkIntegration } from '@/lib/sdk-integrations/api';

/** The npm package customers install. Change here once a new name is published. */
export const SDK_PACKAGE_NAME = '@jamesbond007db05/events-sdk';

const INIT_SNIPPET = `import { Engagement } from '${SDK_PACKAGE_NAME}';

// Run once when your app starts.
Engagement.init({
  apiKey: 'YOUR_SDK_KEY',
  userId: currentUser.id, // optional: who is signed in
});`;

const TRACK_SNIPPET = `// Call this when something meaningful happens.
Engagement.track('project_created', { plan: 'pro' });`;

function CopyBlock({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); the code stays selectable.
    }
  };
  return (
    <div className="relative mt-2 rounded-lg bg-slate-900">
      <pre className="m-0 overflow-x-auto p-3 pr-12 text-xs leading-relaxed text-slate-100"><code>{code}</code></pre>
      <button
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
        onClick={() => void copy()}
        title={copied ? 'Copied' : 'Copy'}
        type="button"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

interface Step {
  key: string;
  title: string;
  done: boolean;
  body: React.ReactNode;
}

interface SdkSetupGuideProps {
  integration: SdkIntegration;
  onRefresh: () => Promise<void> | void;
  onOpenTab: (tab: 'guides' | 'surveys' | 'events') => void;
  onOpenDocs: () => void;
}

function SdkSetupGuide({ integration, onRefresh, onOpenTab, onOpenDocs }: SdkSetupGuideProps): JSX.Element {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listGuides(integration.id), listSurveys(integration.id)])
      .then(([guides, surveys]) => {
        if (!cancelled) setLiveCount([...guides, ...surveys].filter((item) => item.status === 'LIVE').length);
      })
      .catch(() => {
        if (!cancelled) setLiveCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [integration.id]);

  const connected = Boolean(integration.firstConnectedAt || integration.lastConnectedAt);
  const hasEvents = Boolean(integration.lastEventRequestAt);
  const hasLive = (liveCount ?? 0) > 0;

  const steps: Step[] = [
    {
      key: 'install',
      title: 'Install the SDK',
      done: connected,
      body: <CopyBlock code={`npm install ${SDK_PACKAGE_NAME}`} />
    },
    {
      key: 'init',
      title: 'Initialise it with your SDK key',
      done: connected,
      body: (
        <>
          <p className="m-0 text-xs text-slate-500">
            Use the key you were shown when this integration was created. If you no longer have it, use <strong>Regenerate Key</strong> below; the old key stops working.
          </p>
          <CopyBlock code={INIT_SNIPPET} />
        </>
      )
    },
    {
      key: 'connect',
      title: 'Open your app to connect',
      done: connected,
      body: (
        <p className="m-0 text-xs text-slate-500">
          Load any page of {integration.domain ? <span className="font-mono">{integration.domain}</span> : 'your app'} with the SDK installed.
          Requests are only accepted from your allowed origins.
        </p>
      )
    },
    {
      key: 'event',
      title: 'Track your first event',
      done: hasEvents,
      body: (
        <>
          <CopyBlock code={TRACK_SNIPPET} />
          <button className="mt-2 text-xs font-semibold text-slate-700 underline" onClick={() => onOpenTab('events')} type="button">
            See incoming events
          </button>
        </>
      )
    },
    {
      key: 'publish',
      title: 'Publish your first guide or survey',
      done: hasLive,
      body: (
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800" onClick={() => onOpenTab('guides')} type="button">
            Create a guide
          </button>
          <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => onOpenTab('surveys')} type="button">
            Create a survey
          </button>
        </div>
      )
    }
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const complete = doneCount === steps.length;
  const isExpanded = expanded ?? !complete;
  const firstOpen = steps.find((step) => !step.done)?.key;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-base font-semibold text-slate-900">{complete ? 'Setup complete' : 'Set up the SDK'}</h3>
          <p className="m-0 mt-0.5 text-sm text-slate-500">
            {complete ? 'Your app is connected and showing experiences.' : `${doneCount} of ${steps.length} steps done. Steps tick off automatically as your app connects.`}
          </p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <button
          aria-label="Refresh status"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-40"
          disabled={refreshing}
          onClick={() => void refresh()}
          title="Refresh status"
          type="button"
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
        </button>
        <button
          aria-expanded={isExpanded}
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          onClick={() => setExpanded(!isExpanded)}
          type="button"
        >
          {isExpanded ? 'Hide' : 'Show'} steps
          <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={14} />
        </button>
      </header>

      {isExpanded && (
        <ol className="m-0 list-none border-t border-slate-100 p-0">
          {steps.map((step, index) => (
            <li className="flex gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0" key={step.key}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done ? 'bg-emerald-600 text-white' : step.key === firstOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step.done ? <Check size={13} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`m-0 text-sm font-semibold ${step.done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>{step.title}</p>
                {(!step.done || step.key === 'init') && <div className="mt-1.5">{step.body}</div>}
              </div>
            </li>
          ))}
          <li className="px-5 py-3 text-xs text-slate-500">
            Need more detail?{' '}
            <button className="font-semibold text-slate-700 underline" onClick={onOpenDocs} type="button">
              Read the SDK docs
            </button>
          </li>
        </ol>
      )}
    </section>
  );
}

export default SdkSetupGuide;
