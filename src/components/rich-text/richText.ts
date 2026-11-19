import DOMPurify from 'dompurify';

/**
 * Notes are stored as HTML written by the editor, but older notes (and notes written through the API or by an
 * agent) are plain text with line breaks. These helpers read both, and make sure what reaches the page is safe.
 */

const TAG_PATTERN = /<\/?(p|br|h[1-6]|ul|ol|li|strong|em|b|i|u|s|a|blockquote|pre|code|hr|div|span)\b[^>]*>/i;

export const looksLikeHtml = (value: string): boolean => TAG_PATTERN.test(value);

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text with line breaks as paragraphs: a blank line starts a paragraph, a single break stays a break. */
export const plainTextToHtml = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .filter((part) => part.trim() !== '')
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('');

const SAFE_LINK = /^(https?:|mailto:)/i;

let hooked = false;
const ensureHooks = (): void => {
  if (hooked) return;
  hooked = true;
  // Every link opens in a new tab and cannot reach back into this one.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
};

/** HTML that is safe to put on the page: only the formatting the editor offers, and only http(s) and mailto links. */
export const sanitizeRichHtml = (html: string): string => {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 's', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'hr', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: SAFE_LINK
  });
};

/** What the editor opens with, and what the page shows: HTML as is (cleaned), plain text turned into paragraphs. */
export const toRichHtml = (value: string | null | undefined): string => {
  const text = value ?? '';
  if (!text.trim()) return '';
  return sanitizeRichHtml(looksLikeHtml(text) ? text : plainTextToHtml(text));
};

/** The note as plain text with blocks separated by spaces: for previews, search and "is it empty". */
export const richToPlainText = (value: string | null | undefined): string => {
  const text = value ?? '';
  if (!looksLikeHtml(text)) return text.trim();
  const doc = new DOMParser().parseFromString(toRichHtml(text).replace(/<\/(p|li|h[1-4]|blockquote|pre)>|<br\s*\/?>/gi, ' $&'), 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
};

export const isRichEmpty = (value: string | null | undefined): boolean => richToPlainText(value) === '';

/** Turns what a person typed into a link address: adds https:// when there is no scheme, refuses anything unsafe. */
export const normalizeLinkUrl = (input: string): string | null => {
  const raw = input.trim();
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? `mailto:${raw}` : `https://${raw}`;
  return SAFE_LINK.test(candidate) ? candidate : null;
};
