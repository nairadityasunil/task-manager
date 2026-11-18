import { AlertTriangle, Mail, RotateCcw, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Input, Switch, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { adminApi, type EmailTemplate } from './adminService';

/**
 * The emails the app sends. Each one is a subject and an HTML body with {{variables}} that are filled in when it
 * is sent. Edit them here, see a live preview, send yourself a test, or go back to the default.
 */
export function EmailTemplatesTab(): JSX.Element {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [error, setError] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await adminApi.emailTemplates();
      setTemplates(list);
      setCode((current) => current ?? list[0]?.code ?? null);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <EmptyState description="The templates could not be loaded." icon={Mail} title="Something went wrong" />;
  if (!templates) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  const current = templates.find((t) => t.code === code) ?? templates[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]" data-testid="admin-email-templates">
      <nav aria-label="Email templates" className="grid content-start gap-1 rounded-xl border border-slate-200 bg-white p-2">
        {templates.map((t) => (
          <button
            aria-current={t.code === current.code ? 'true' : undefined}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
              t.code === current.code ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
            )}
            data-testid={`template-${t.code}`}
            key={t.code}
            onClick={() => setCode(t.code)}
            type="button"
          >
            <span className="truncate">{t.name}</span>
            {!t.isActive ? <Badge tone="neutral">Off</Badge> : null}
          </button>
        ))}
      </nav>
      <Editor
        key={current.code}
        onSaved={(saved) => setTemplates((list) => (list ?? []).map((t) => (t.code === saved.code ? saved : t)))}
        showToast={showToast}
        template={current}
      />
    </div>
  );
}

function Editor({
  template,
  onSaved,
  showToast,
}: {
  template: EmailTemplate;
  onSaved: (t: EmailTemplate) => void;
  showToast: ReturnType<typeof useToast>['showToast'];
}): JSX.Element {
  const [subject, setSubject] = useState(template.subject);
  const [html, setHtml] = useState(template.html);
  const [isActive, setIsActive] = useState(template.isActive);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'reset' | 'test' | null>(null);
  const [testTo, setTestTo] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = subject !== template.subject || html !== template.html || isActive !== template.isActive;

  // Live preview of the draft with sample values, shortly after typing stops.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      adminApi
        .previewEmailTemplate(template.code, { subject, html })
        .then((r) => {
          if (cancelled) return;
          setPreview(r);
          setUnknown(r.unknownVariables);
          setPreviewError(null);
        })
        .catch((e) => !cancelled && setPreviewError(toDisplayErrorMessage(e)));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [template.code, subject, html]);

  const insertVariable = (key: string): void => {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      setHtml((h) => h + token);
      return;
    }
    const start = el.selectionStart ?? html.length;
    const end = el.selectionEnd ?? html.length;
    setHtml(html.slice(0, start) + token + html.slice(end));
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async (): Promise<void> => {
    setBusy('save');
    try {
      const result = await adminApi.updateEmailTemplate(template.code, { subject, html, isActive });
      onSaved(result.template);
      setUnknown(result.unknownVariables);
      showToast({ message: 'Template saved.', variant: 'success' });
    } catch (e) {
      showToast({ message: toDisplayErrorMessage(e), variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const reset = async (): Promise<void> => {
    if (!window.confirm('Go back to the default subject and body? Your edits to this email will be lost.')) return;
    setBusy('reset');
    try {
      const fresh = await adminApi.resetEmailTemplate(template.code);
      onSaved(fresh);
      setSubject(fresh.subject);
      setHtml(fresh.html);
      setIsActive(fresh.isActive);
      showToast({ message: 'Back to the default.', variant: 'success' });
    } catch (e) {
      showToast({ message: toDisplayErrorMessage(e), variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async (): Promise<void> => {
    setBusy('test');
    try {
      const r = await adminApi.testEmailTemplate(template.code, { to: testTo, subject, html });
      showToast({ message: r.message, variant: 'success' });
    } catch (e) {
      showToast({ message: toDisplayErrorMessage(e), variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="grid min-w-0 gap-4" data-testid="email-template-editor">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold text-slate-900">{template.name}</h2>
          <p className="m-0 mt-1 max-w-2xl text-[13px] text-slate-600">{template.description}</p>
        </div>
        <Switch
          checked={isActive}
          data-testid="template-active"
          disabled={!template.canDisable}
          label={template.canDisable ? (isActive ? 'Sent' : 'Switched off') : 'Always sent'}
          onChange={(event) => setIsActive(event.target.checked)}
        />
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid content-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
            Subject
            <Input data-testid="template-subject" maxLength={200} onChange={(e) => setSubject(e.target.value)} value={subject} />
          </label>
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-slate-700">Variables (click to insert into the body)</span>
            <div className="flex flex-wrap gap-1.5" data-testid="template-variables">
              {template.variables.map((v) => (
                <button
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:bg-slate-100"
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  title={`${v.description}. Example: ${v.sample.length > 80 ? `${v.sample.slice(0, 80)}…` : v.sample}`}
                  type="button"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
          <label className="grid gap-1.5 text-[13px] font-medium text-slate-700">
            Body (HTML)
            <textarea
              className="min-h-[340px] w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-[12px] leading-relaxed text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-600/20"
              data-testid="template-body"
              onChange={(e) => setHtml(e.target.value)}
              ref={bodyRef}
              spellCheck={false}
              value={html}
            />
          </label>
          {unknown.length ? (
            <p className="m-0 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900" role="status">
              <AlertTriangle className="mt-0.5 shrink-0" size={14} />
              <span>
                These variables are not available for this email and will be empty: {unknown.map((u) => `{{${u}}}`).join(', ')}
              </span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button data-testid="template-save" disabled={!dirty} loading={busy === 'save'} onClick={() => void save()}>
              Save changes
            </Button>
            <Button disabled={busy !== null} onClick={() => void reset()} variant="secondary">
              <RotateCcw size={14} /> Reset to default
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <label className="grid min-w-52 flex-1 gap-1.5 text-[13px] font-medium text-slate-700">
              Send a test to
              <Input data-testid="template-test-to" onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" type="email" value={testTo} />
            </label>
            <Button data-testid="template-test" disabled={!testTo.trim()} loading={busy === 'test'} onClick={() => void sendTest()} variant="secondary">
              <Send size={14} /> Send test
            </Button>
          </div>
          <p className="m-0 text-[12px] text-slate-500">The test uses the draft above with sample values and does not save it.</p>
        </div>

        <div className="grid content-start gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-slate-700">Preview with sample values</span>
          </div>
          {previewError ? (
            <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
              {previewError}
            </p>
          ) : null}
          <p className="m-0 truncate rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700" data-testid="template-preview-subject">
            <span className="text-slate-500">Subject: </span>
            {preview?.subject ?? '…'}
          </p>
          {/* An empty sandbox: the email's own markup is shown, and nothing in it can run. */}
          <iframe className="h-[560px] w-full rounded-lg border border-slate-200 bg-white" data-testid="template-preview" sandbox="" srcDoc={preview?.html ?? ''} title="Email preview" />
        </div>
      </div>
    </section>
  );
}
