import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { AI_PROVIDERS, AiKeySetup, providerHint, providerName, type AiProvider } from './AiKeySetup';

/** Settings → Profile: connect, replace or remove your own AI provider keys. */
export function AiProvidersCard(): JSX.Element {
  const { user, updateProfile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<AiProvider | null>(null);
  const [removing, setRemoving] = useState<AiProvider | null>(null);
  const linked = new URLSearchParams(location.search).get('section') === 'ai';

  // /settings?tab=profile&section=ai ("Connect" on Home) lands here with the first provider open.
  useEffect(() => {
    if (!linked) return;
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setOpen((current) => current ?? AI_PROVIDERS.find((p) => !user?.[`${p}ApiKeyConfigured` as const]) ?? null);
  }, [linked, user]);

  const remove = async (provider: AiProvider): Promise<void> => {
    const ok = await confirm({
      title: `Remove your ${providerName(provider)} key?`,
      message: 'AI features that use this provider stop working for you until you add a key again.',
      confirmText: 'Remove key',
      type: 'danger'
    });
    if (!ok) return;
    setRemoving(provider);
    try {
      await updateProfile({ [`${provider}ApiKey`]: '' });
      showToast({ variant: 'success', message: `${providerName(provider)} key removed` });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="scroll-mt-4" data-testid="ai-providers" id="ai-providers" ref={ref}>
      <Card>
        <CardHeader
          description="Your own keys for AI planning, task breakdown and notes. Stored encrypted and used only for your requests."
          title="AI providers"
        />
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {AI_PROVIDERS.map((provider) => {
            const own = Boolean(user?.[`${provider}ApiKeyConfigured` as const]);
            const server = Boolean(user?.aiPlatformProviders?.includes(provider));
            return (
              <li className="px-4 py-3" key={provider}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-900">
                      {providerName(provider)}
                      {own ? (
                        <Badge dot tone="success">
                          Connected
                        </Badge>
                      ) : server ? (
                        <Badge tone="neutral">Provided by your workspace</Badge>
                      ) : (
                        <Badge tone="neutral">Not connected</Badge>
                      )}
                    </div>
                    <p className="m-0 mt-0.5 text-xs text-slate-500">{providerHint(provider)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setOpen(open === provider ? null : provider)} size="sm" variant={own ? 'secondary' : 'primary'}>
                      {open === provider ? 'Cancel' : own ? 'Replace key' : 'Connect'}
                    </Button>
                    {own ? (
                      <Button loading={removing === provider} onClick={() => void remove(provider)} size="sm" variant="ghost">
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                {open === provider ? <AiKeySetup className="mt-3" inSettings onSaved={() => setOpen(null)} provider={provider} /> : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
