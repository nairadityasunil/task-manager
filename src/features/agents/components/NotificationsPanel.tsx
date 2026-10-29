import { useCallback, useEffect, useState } from 'react';
import { BellRing, Plus, RotateCw, Send, Trash2, Webhook } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { Badge, Button, Card, CardHeader, Field, cn, inputClass, selectClass } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentsApi, timeAgo, type AgentWebhook, type WebhookEvent, type WebhookInput } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { SecretReveal } from './shared';

const EVENTS: Array<{ value: WebhookEvent; label: string; hint: string }> = [
  { value: 'alert.raised', label: 'Alerts', hint: 'Unregistered agents, budget, rate limits, bulk deletes and more' },
  { value: 'approval.requested', label: 'Approval requests', hint: 'An agent action is waiting for a decision' },
  { value: 'approval.decided', label: 'Approval outcomes', hint: 'Rejected, or approved and run (or failed)' },
  { value: 'activity.blocked', label: 'Blocked actions', hint: 'Every agent call a policy or limit refused' }
];

const SIGNATURE_SNIPPET = `// Node: verify a delivery before trusting it
const crypto = require('crypto');
const expected = 'sha256=' + crypto
  .createHmac('sha256', process.env.PRISTINE_WEBHOOK_SECRET)
  .update(req.headers['x-pristine-timestamp'] + '.' + rawBody)
  .digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-pristine-signature']));`;

function WebhookForm({
  initial,
  onClose,
  onSave
}: {
  initial?: AgentWebhook;
  onClose: () => void;
  onSave: (input: WebhookInput) => Promise<void>;
}): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [format, setFormat] = useState<AgentWebhook['format']>(initial?.format ?? 'json');
  const [events, setEvents] = useState<WebhookEvent[]>(initial?.events ?? ['alert.raised', 'approval.requested']);
  const [minSeverity, setMinSeverity] = useState<AgentWebhook['minSeverity']>(initial?.minSeverity ?? 'warning');
  const [saving, setSaving] = useState(false);
  const valid = name.trim() && url.trim().startsWith('https://') && events.length > 0;
  return (
    <Modal
      description="Send Agent Governance events to Slack, a SIEM such as Splunk or Datadog, or any HTTPS endpoint."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ name: name.trim(), url: url.trim(), format, events, minSeverity });
              } finally {
                setSaving(false);
              }
            }}
            variant="primary"
          >
            {initial ? 'Save' : 'Add webhook'}
          </Button>
        </>
      }
      maxWidth="max-w-[600px]"
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'New webhook'}
    >
      <div className="space-y-4">
        <Field label="Name">
          <input autoFocus className={inputClass} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Security channel" value={name} />
        </Field>
        <Field hint="Must start with https://. Private and local addresses are refused." label="URL">
          <input className={cn(inputClass, 'font-mono text-[13px]')} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" value={url} />
        </Field>
        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium text-slate-700">Format</span>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Format">
            {(
              [
                ['slack', 'Slack message', 'For a Slack incoming webhook'],
                ['json', 'Signed JSON', 'For a SIEM, Zapier or your own endpoint']
              ] as const
            ).map(([value, label, hint]) => (
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-lg border p-2.5',
                  format === value ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 hover:border-slate-300'
                )}
                key={value}
              >
                <input checked={format === value} className="mt-0.5 accent-emerald-600" name="format" onChange={() => setFormat(value)} type="radio" />
                <span>
                  <span className="block text-[13px] font-medium text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium text-slate-700">Send</span>
          {EVENTS.map((event) => (
            <label className="flex cursor-pointer items-start gap-2 text-[13px]" key={event.value}>
              <input
                checked={events.includes(event.value)}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
                onChange={(e) => setEvents((current) => (e.target.checked ? [...current, event.value] : current.filter((v) => v !== event.value)))}
                type="checkbox"
              />
              <span>
                <span className="font-medium text-slate-800">{event.label}</span>
                <span className="block text-xs text-slate-500">{event.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {events.includes('alert.raised') ? (
          <Field label="Alerts from">
            <select className={selectClass} onChange={(e) => setMinSeverity(e.target.value as AgentWebhook['minSeverity'])} value={minSeverity}>
              <option value="info">Info and above (everything)</option>
              <option value="warning">Warning and above</option>
              <option value="critical">Critical only</option>
            </select>
          </Field>
        ) : null}
      </div>
    </Modal>
  );
}

export function NotificationsPanel({ workspaceId, canAdmin }: { workspaceId: string | null; canAdmin: boolean }): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [hooks, setHooks] = useState<AgentWebhook[] | null>(null);
  const [editing, setEditing] = useState<AgentWebhook | 'new' | null>(null);
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setHooks(await agentsApi.webhooks(workspaceId));
    } catch (error) {
      setHooks([]);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  }, [workspaceId, showToast]);

  useEffect(() => {
    if (canAdmin) void load();
  }, [canAdmin, load]);

  if (!canAdmin) {
    return <EmptyState description="Workspace owners and admins choose where governance events are sent." icon={BellRing} title="Admins only" />;
  }

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          actions={
            <Button icon={Plus} onClick={() => setEditing('new')} size="sm" variant="primary">
              New webhook
            </Button>
          }
          description="Alerts, approvals and blocked actions, delivered as they happen. Failed deliveries are retried; a webhook that fails 10 times in a row is turned off."
          icon={<Webhook className="h-4 w-4 shrink-0 text-slate-400" />}
          title="Webhooks"
        />
        {hooks == null ? (
          <div className="space-y-2 p-4">
            <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : hooks.length === 0 ? (
          <div className="p-4">
            <EmptyState
              compact
              description="Send governance events to a Slack channel, your SIEM or any HTTPS endpoint."
              icon={Webhook}
              title="No webhooks yet"
            />
          </div>
        ) : (
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {hooks.map((hook) => (
              <li className="space-y-2 px-4 py-3" data-testid="webhook-row" key={hook.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-900">{hook.name}</span>
                      <Badge tone="neutral">{hook.format === 'slack' ? 'Slack' : 'Signed JSON'}</Badge>
                      {hook.enabled ? (
                        hook.lastError ? (
                          <Badge dot tone="warning">
                            Last delivery failed
                          </Badge>
                        ) : (
                          <Badge dot tone="success">
                            On
                          </Badge>
                        )
                      ) : (
                        <Badge dot>Off</Badge>
                      )}
                    </div>
                    <p className="m-0 mt-0.5 truncate font-mono text-xs text-slate-500">{hook.url}</p>
                    <p className="m-0 mt-0.5 text-xs text-slate-500">
                      {hook.events.map((e) => EVENTS.find((x) => x.value === e)?.label ?? e).join(', ')}
                      {hook.events.includes('alert.raised') ? ` · alerts from ${hook.minSeverity}` : ''}
                      {hook.lastDeliveryAt
                        ? ` · last delivery ${timeAgo(hook.lastDeliveryAt)}${hook.lastStatus ? ` (HTTP ${hook.lastStatus})` : ''}`
                        : ' · nothing sent yet'}
                    </p>
                    {hook.disabledReason ? <p className="m-0 mt-1 text-xs text-red-700">{hook.disabledReason}</p> : null}
                    {hook.enabled && hook.lastError ? <p className="m-0 mt-1 text-xs text-amber-800">{hook.lastError}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      icon={Send}
                      loading={busy === `test:${hook.id}`}
                      onClick={() =>
                        void run(`test:${hook.id}`, async () => {
                          const result = await agentsApi.testWebhook(hook.id, workspaceId);
                          showToast(
                            result.ok
                              ? { variant: 'success', message: `Test delivered (HTTP ${result.status})` }
                              : { variant: 'error', message: `Test failed: ${result.status ? `HTTP ${result.status}` : result.body}` }
                          );
                          await load();
                        })
                      }
                      size="sm"
                    >
                      Send test
                    </Button>
                    <Button
                      onClick={() =>
                        void run(hook.id, async () => {
                          await agentsApi.updateWebhook(hook.id, { enabled: !hook.enabled }, workspaceId);
                          await load();
                        })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      {hook.enabled ? 'Turn off' : 'Turn on'}
                    </Button>
                    <Button onClick={() => setEditing(hook)} size="sm" variant="ghost">
                      Edit
                    </Button>
                    {hook.format === 'json' ? (
                      <Button
                        aria-label={`Rotate secret of ${hook.name}`}
                        icon={RotateCw}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Rotate signing secret?',
                            message: 'Deliveries are signed with the new secret at once. Update the receiver first.',
                            confirmText: 'Rotate'
                          });
                          if (!ok) return;
                          void run(hook.id, async () => {
                            const result = await agentsApi.updateWebhook(hook.id, { rotateSecret: true }, workspaceId);
                            if (result.secret) setSecret({ name: hook.name, value: result.secret });
                          });
                        }}
                        size="icon-sm"
                        variant="ghost"
                      />
                    ) : null}
                    <Button
                      aria-label={`Delete ${hook.name}`}
                      icon={Trash2}
                      onClick={async () => {
                        const ok = await confirm({ title: 'Delete webhook?', message: `"${hook.name}" stops receiving events.`, confirmText: 'Delete', type: 'danger' });
                        if (!ok) return;
                        void run(hook.id, async () => {
                          await agentsApi.deleteWebhook(hook.id, workspaceId);
                          showToast({ variant: 'success', message: 'Webhook deleted' });
                          await load();
                        });
                      }}
                      size="icon-sm"
                      variant="ghost"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader description="Signed JSON deliveries carry these headers. Check the signature before trusting a delivery." title="Verifying deliveries" />
        <div className="space-y-2 p-4 text-[13px] text-slate-600">
          <p className="m-0">
            <code className="font-mono text-xs">X-Pristine-Signature</code> is an HMAC-SHA256 of{' '}
            <code className="font-mono text-xs">timestamp + &quot;.&quot; + body</code> with the webhook&apos;s secret;{' '}
            <code className="font-mono text-xs">X-Pristine-Timestamp</code> lets you reject old deliveries;{' '}
            <code className="font-mono text-xs">X-Pristine-Event</code> and <code className="font-mono text-xs">X-Pristine-Delivery</code> name the event and
            delivery.
          </p>
          <pre className="m-0 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">{SIGNATURE_SNIPPET}</pre>
        </div>
      </Card>

      {editing ? (
        <WebhookForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            try {
              if (editing === 'new') {
                const created = await agentsApi.createWebhook(input, workspaceId);
                if (created.webhook.format === 'json') setSecret({ name: created.webhook.name, value: created.secret });
                showToast({ variant: 'success', message: 'Webhook added' });
              } else {
                await agentsApi.updateWebhook(editing.id, input, workspaceId);
                showToast({ variant: 'success', message: 'Webhook saved' });
              }
              setEditing(null);
              await load();
            } catch (error) {
              showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
            }
          }}
        />
      ) : null}

      {secret ? (
        <Modal
          description="Use it to verify deliveries. This is the only time it is shown."
          footer={
            <Button onClick={() => setSecret(null)} variant="primary">
              Done
            </Button>
          }
          onClose={() => setSecret(null)}
          title={`Signing secret for ${secret.name}`}
        >
          <SecretReveal label="Copy secret" value={secret.value} />
        </Modal>
      ) : null}
    </div>
  );
}
