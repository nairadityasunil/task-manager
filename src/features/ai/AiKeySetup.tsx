import { useState } from 'react';
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react';

import { Button, cn, inputClass } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toDisplayErrorMessage } from '@/utils/apiError';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

const SETUP: Record<AiProvider, { name: string; keyUrl: string; hint: string }> = {
  gemini: {
    name: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    hint: 'Google AI Studio gives free keys with a generous free tier: the easiest way to start.'
  },
  openai: {
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    hint: 'Create a secret key under API keys. Usage is billed to your OpenAI account.'
  },
  anthropic: {
    name: 'Anthropic Claude',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    hint: 'Create a key in the Anthropic Console. Usage is billed to your Anthropic account.'
  }
};

export const AI_PROVIDERS: AiProvider[] = ['gemini', 'openai', 'anthropic'];
export const providerHint = (provider: AiProvider): string => SETUP[provider].hint;

export const providerName = (provider: AiProvider): string => SETUP[provider].name;

/** Whether the signed-in person can use this provider: their own key, or the server's. */
export function useAiProviderReady(provider: AiProvider): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user[`${provider}ApiKeyConfigured` as const]) return true;
  return Boolean(user.aiPlatformProviders?.includes(provider));
}

/** First-run setup in place: where to get a key, paste it, save it. */
export function AiKeySetup({
  provider,
  onSaved,
  className,
  inSettings = false
}: {
  provider: AiProvider;
  onSaved?: () => void;
  className?: string;
  /** Shown in Settings itself: no "go to Settings" hint. */
  inSettings?: boolean;
}): JSX.Element {
  const { updateProfile } = useAuth();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const setup = SETUP[provider];

  const save = async (): Promise<void> => {
    setBusy(true);
    setResult(null);
    try {
      await updateProfile({ [`${provider}ApiKey`]: key.trim() });
      setKey('');
      setResult({ ok: true, message: `${setup.name} key saved. You're ready to go.` });
      onSaved?.();
    } catch (error) {
      setResult({ ok: false, message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4', className)} data-testid="ai-key-setup">
      <div className="flex items-start gap-2.5">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900">Connect {setup.name} to use AI</div>
          <ol className="m-0 mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
            <li>
              Get a key at{' '}
              <a className="font-medium text-emerald-700 underline" href={setup.keyUrl} rel="noreferrer noopener" target="_blank">
                {new URL(setup.keyUrl).host}
              </a>
              . {setup.hint}
            </li>
            <li>Paste it here. It is stored encrypted and used only for your own AI requests.</li>
          </ol>
        </div>
      </div>
      {/* Not a <form>: this sits inside other forms (e.g. the planner's). */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label={`${setup.name} API key`}
          autoComplete="off"
          className={cn(inputClass, 'min-w-0 flex-1 font-mono')}
          onChange={(event) => setKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (key.trim().length >= 8 && !busy) void save();
          }}
          placeholder="Paste your API key"
          spellCheck={false}
          type="password"
          value={key}
        />
        <Button disabled={key.trim().length < 8} loading={busy} onClick={() => void save()} variant="primary">
          Save key
        </Button>
      </div>
      {inSettings ? null : <p className="m-0 text-xs text-slate-500">You can change or remove keys any time under Settings → Profile → AI providers.</p>}
      {result ? (
        <p className={cn('m-0 flex items-start gap-1.5 text-xs', result.ok ? 'text-emerald-700' : 'text-red-700')} role={result.ok ? 'status' : 'alert'}>
          {result.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
