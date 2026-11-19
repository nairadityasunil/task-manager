import { cn } from '@/components/ui';

import { toRichHtml } from './richText';

/** Shows a note: formatting and links as written, plain text as paragraphs. Everything is cleaned before it is shown. */
export function RichTextView({ value, className }: { value: string | null | undefined; className?: string }): JSX.Element | null {
  const html = toRichHtml(value);
  if (!html) return null;
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default RichTextView;
