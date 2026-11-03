import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';

import { cn } from '@/components/ui';
import { agentsApi } from '@/services/agents';

export const formatUsd = (usd: number): string => (usd > 0 && usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`);

/** "AI spend $1.24 · 38k tokens" for a project or a moment onwards, linking to the Costs tab. */
export function AiSpend({
  projectId,
  since,
  label = 'AI spend',
  className,
  hideWhenZero = true,
  refreshKey
}: {
  projectId?: string;
  since?: string;
  label?: string;
  className?: string;
  hideWhenZero?: boolean;
  refreshKey?: unknown;
}): JSX.Element | null {
  const [data, setData] = useState<{ usd: number; tokens: number; calls: number } | null>(null);

  useEffect(() => {
    if (!projectId && !since) return;
    let cancelled = false;
    agentsApi
      .costSummary({ projectId, since })
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, since, refreshKey]);

  if (!data || (hideWhenZero && data.calls === 0)) return null;
  const tokens = data.tokens >= 1000 ? `${Math.round(data.tokens / 100) / 10}k` : String(data.tokens);
  return (
    <Link
      className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900', className)}
      data-testid="ai-spend"
      title={`${data.calls} AI call${data.calls === 1 ? '' : 's'} · open AI costs`}
      to="/agents/costs"
    >
      <Coins aria-hidden size={13} />
      {label} <span className="font-mono font-medium text-slate-900">{formatUsd(data.usd)}</span>
      <span className="font-mono text-slate-500">· {tokens} tokens</span>
    </Link>
  );
}
