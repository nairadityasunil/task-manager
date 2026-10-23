import { useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';

import logoImg from '@/assets/logo.png';
import { buttonClass, cn } from '@/components/ui';

/** Logo mark + wordmark. */
export function Logo({ className }: { className?: string }): JSX.Element {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
        <img alt="" className="h-full w-full object-contain" src={logoImg} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-slate-900">Pristine</span>
    </span>
  );
}

/** A 44px call-to-action button class. */
export function ctaClass(variant: 'primary' | 'secondary' | 'accent', extra?: string): string {
  return buttonClass(variant, 'md', cn('h-11 px-5 text-[15px]', extra));
}

/** Centred (or left-aligned) heading used by each marketing section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  dark = false,
  id
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  dark?: boolean;
  id?: string;
}): JSX.Element {
  return (
    <div className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : '')} data-reveal>
      <p className={cn('m-0 text-sm font-medium', dark ? 'text-emerald-400' : 'text-emerald-700')}>{eyebrow}</p>
      <h2
        className={cn('m-0 mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl', dark ? 'text-white' : 'text-slate-900')}
        id={id}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn('m-0 mt-3 text-[15px] leading-relaxed', dark ? 'text-slate-300' : 'text-slate-600')}>{description}</p>
      ) : null}
    </div>
  );
}

/** Bulleted list with emerald checkmarks. */
export function CheckList({ items, dark = false, className }: { items: ReactNode[]; dark?: boolean; className?: string }): JSX.Element {
  return (
    <ul className={cn('m-0 grid list-none gap-2.5 p-0 text-sm', dark ? 'text-slate-300' : 'text-slate-700', className)}>
      {items.map((item, i) => (
        <li className="flex items-start gap-2.5" key={i}>
          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
              dark ? 'bg-emerald-400/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
            )}
          >
            <Check size={10} strokeWidth={3} />
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

const TOKEN_RE = /(\/\/[^\n]*|'[^'\n]*'|`[^`]*`|\b(?:import|from|const|await|export|new|return)\b|\b[A-Z][A-Za-z]+(?=\.)|\.\w+(?=\())/g;

/** Very small syntax highlighter for the JavaScript snippets on the marketing pages. */
function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of code.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start > last) out.push(code.slice(last, start));
    const token = match[0];
    let cls = 'text-sky-300';
    if (token.startsWith('//')) cls = 'text-slate-500';
    else if (token.startsWith("'") || token.startsWith('`')) cls = 'text-emerald-300';
    else if (token.startsWith('.')) cls = 'text-amber-200';
    else if (/^[A-Z]/.test(token)) cls = 'text-slate-100';
    out.push(
      <span className={cls} key={i++}>
        {token}
      </span>
    );
    last = start + token.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** Dark code block with a file label and a copy button. */
export function CodeBlock({ code, label, className }: { code: string; label: string; className?: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };
  return (
    <div className={cn('min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
        <span className="truncate font-mono text-xs text-slate-400">{label}</span>
        <button
          aria-label={copied ? 'Copied' : `Copy ${label}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          onClick={copy}
          type="button"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-300">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
