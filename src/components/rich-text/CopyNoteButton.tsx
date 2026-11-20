import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { useToast } from '@/context/ToastContext';

import { looksLikeHtml, toRichHtml } from './richText';

/** A note as plain text that keeps its structure: paragraphs on their own lines and bullets as "• ". */
export const noteToClipboardText = (title: string | null | undefined, body: string | null | undefined): string => {
  const raw = body ?? '';
  let text = raw.trim();
  if (looksLikeHtml(raw)) {
    const html = toRichHtml(raw)
      .replace(/<li[^>]*>/gi, '$&• ')
      .replace(/<\/(p|li|h[1-4]|blockquote|pre|div|ul|ol)>|<br\s*\/?>/gi, '$&\n');
    text = (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
  }
  const heading = (title ?? '').trim();
  return heading ? `${heading}\n\n${text}`.trim() : text;
};

interface Props {
  title?: string | null;
  /** The note's description: rich text (HTML) or plain text. */
  body: string | null | undefined;
  size?: 'sm' | 'md';
  testId?: string;
}

/** Copies one note to the clipboard (as plain text, and as formatted text where the browser allows it). */
export function CopyNoteButton({ title, body, size = 'sm', testId = 'copy-note' }: Props): JSX.Element {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (): Promise<void> => {
    const text = noteToClipboardText(title, body);
    try {
      const rich = looksLikeHtml(body ?? '') ? `${title ? `<h3>${title.replace(/</g, '&lt;')}</h3>` : ''}${toRichHtml(body)}` : null;
      if (rich && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([rich], { type: 'text/html' }) })]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ variant: 'error', message: 'Could not copy. Your browser blocked access to the clipboard.' });
    }
  };

  return (
    <Button aria-label={copied ? 'Copied' : 'Copy note'} data-testid={testId} icon={copied ? Check : Copy} onClick={() => void copy()} size={size} title={copied ? 'Copied' : 'Copy note'} type="button" variant="ghost" />
  );
}
