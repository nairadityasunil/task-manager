import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Undo2, Unlink } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/components/ui';

import { normalizeLinkUrl, toRichHtml } from './richText';

interface RichTextEditorProps {
  /** The note as stored: HTML, or plain text from before the editor existed. */
  value: string;
  /** The note as HTML; an empty editor gives ''. */
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the writing area in pixels (it scrolls past about half the window). */
  minHeight?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

function ToolbarButton({ active, disabled, label, onClick, children, testId }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: ReactNode; testId?: string }): JSX.Element {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-slate-200 text-slate-900'
      )}
      data-testid={testId}
      disabled={disabled}
      // Keep the selection in the editor when a toolbar button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

/** Asks for the address of a link: on the selected text, or, with nothing selected, with its own text. */
function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }): JSX.Element {
  const hasSelection = !editor.state.selection.empty;
  const existing = (editor.getAttributes('link').href as string | undefined) ?? '';
  const [url, setUrl] = useState(existing);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const apply = (): void => {
    const href = normalizeLinkUrl(url);
    if (!href) {
      setError('Enter a web address (https://…) or an email address.');
      return;
    }
    const chain = editor.chain().focus();
    if (hasSelection || editor.isActive('link')) {
      chain.extendMarkRange('link').setLink({ href }).run();
    } else {
      chain.insertContent({ type: 'text', text: text.trim() || href, marks: [{ type: 'link', attrs: { href } }] }).run();
    }
    onClose();
  };

  return (
    <div className="absolute left-1 top-full z-20 mt-1 grid w-[min(320px,calc(100%-0.5rem))] gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg" data-testid="rich-link-popover">
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        {hasSelection || existing ? 'Link address' : 'Web address'}
        <input
          className="h-8 rounded-md border border-slate-300 px-2 text-[13px] font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
          data-testid="rich-link-url"
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              apply();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
          }}
          placeholder="https://example.com"
          ref={inputRef}
          type="text"
          value={url}
        />
      </label>
      {!hasSelection && !existing ? (
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          Text to show (optional)
          <input
            className="h-8 rounded-md border border-slate-300 px-2 text-[13px] font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
            data-testid="rich-link-text"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                apply();
              }
            }}
            type="text"
            value={text}
          />
        </label>
      ) : null}
      {error ? <p className="m-0 text-xs text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button className="h-7 rounded-md px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="h-7 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-800" data-testid="rich-link-apply" onClick={apply} type="button">
          {existing ? 'Update link' : 'Add link'}
        </button>
      </div>
    </div>
  );
}

/**
 * The note editor: bold, italic, strike, code, heading, lists, quote, undo/redo and links (select text, press the link
 * button or Ctrl/Cmd+K). Output is HTML; the server cleans it again and the page cleans it before showing it.
 */
export function RichTextEditor({ value, onChange, placeholder = 'Write here…', minHeight = 280, autoFocus = false, disabled = false, 'aria-label': ariaLabel = 'Note' }: RichTextEditorProps): JSX.Element {
  const [linkOpen, setLinkOpen] = useState(false);
  // Everything the editor itself produced recently (cleaned the same way as incoming values), so the parent handing
  // back an older version while someone types fast is never mistaken for a different note.
  const emitted = useRef<Set<string>>(new Set([toRichHtml(value)]));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, horizontalRule: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ['mailto'],
        isAllowedUri: (url: string) => /^(https?:|mailto:)/i.test(url),
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' }
      }),
      Placeholder.configure({ placeholder })
    ],
    content: toRichHtml(value),
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'rich-text rich-text-editor focus:outline-none',
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
        'data-testid': 'rich-text-editor',
        style: `min-height:${minHeight}px`
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          // In the editor Ctrl/Cmd+K is the link shortcut; keep it from also opening the app-wide search.
          event.preventDefault();
          event.stopPropagation();
          setLinkOpen(true);
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML();
      emitted.current.add(toRichHtml(html));
      if (emitted.current.size > 200) emitted.current = new Set([...emitted.current].slice(-50));
      onChange(html);
    }
  });

  // A different note was opened: show it. A value the editor itself produced is never applied back, so typing is
  // never overwritten.
  useEffect(() => {
    if (!editor) return;
    const incoming = toRichHtml(value);
    if (emitted.current.has(incoming)) return;
    emitted.current = new Set([incoming]);
    editor.commands.setContent(incoming, false);
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  if (!editor) return <div className="rounded-lg border border-slate-300 bg-white" style={{ minHeight: minHeight + 40 }} />;

  const inLink = editor.isActive('link');

  return (
    <div
      // Inside a <label> (the app's Field), a click in the writing area would be passed on to the first button of
      // the toolbar. Cancel that: clicks on the buttons and inputs themselves are left alone.
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button, input')) event.preventDefault();
      }}
      className={cn('relative min-w-0 max-w-full rounded-lg border border-slate-300 bg-white transition-colors focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15', disabled && 'bg-slate-50 opacity-70')}>
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-1.5 py-1" role="toolbar" aria-label="Formatting">
        <ToolbarButton active={editor.isActive('bold')} disabled={disabled} label="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} testId="rich-bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} disabled={disabled} label="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} testId="rich-italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} disabled={disabled} label="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('code')} disabled={disabled} label="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </ToolbarButton>
        <span aria-hidden className="mx-1 h-4 w-px bg-slate-200" />
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} disabled={disabled} label="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('bulletList')} disabled={disabled} label="Bulleted list" onClick={() => editor.chain().focus().toggleBulletList().run()} testId="rich-bullets">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} disabled={disabled} label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} disabled={disabled} label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolbarButton>
        <span aria-hidden className="mx-1 h-4 w-px bg-slate-200" />
        <ToolbarButton active={inLink} disabled={disabled} label="Link (Ctrl+K): select text, then add the address" onClick={() => setLinkOpen((open) => !open)} testId="rich-link">
          <Link2 size={15} />
        </ToolbarButton>
        {inLink ? (
          <ToolbarButton disabled={disabled} label="Remove link" onClick={removeLink} testId="rich-unlink">
            <Unlink size={15} />
          </ToolbarButton>
        ) : null}
        <span aria-hidden className="mx-1 h-4 w-px bg-slate-200" />
        <ToolbarButton disabled={disabled || !editor.can().undo()} label="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton disabled={disabled || !editor.can().redo()} label="Redo (Ctrl+Shift+Z)" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
        {linkOpen ? <LinkPopover editor={editor} onClose={() => { setLinkOpen(false); editor.commands.focus(); }} /> : null}
      </div>
      <EditorContent editor={editor} className="max-h-[min(46vh,500px)] min-w-0 overflow-x-hidden overflow-y-auto px-3.5 py-3 text-sm text-slate-800" />
    </div>
  );
}

export default RichTextEditor;
