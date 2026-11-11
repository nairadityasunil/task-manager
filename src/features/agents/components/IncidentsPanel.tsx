import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, OctagonX, Play, Send, ShieldAlert, Siren, Users } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import Modal from '@/components/Modal';
import { Badge, Button, Card, Checkbox, cn } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentsApi, timeAgo, type AgentIncident, type AgentIncidentDetail } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const STATUS_TONE = { open: 'danger', contained: 'warning', resolved: 'success' } as const;
const TRIGGER_LABEL: Record<string, string> = {
  key_abuse: 'Key abuse',
  privilege_escalation: 'Privilege escalation',
  rapid_enumeration: 'Rapid enumeration',
  exfiltration: 'Data exfiltration',
  mass_delete: 'Mass delete',
  repeated_blocks: 'Repeated blocks',
  critical_risk: 'Critical risk',
  dlp: 'Data loss prevention'
};

/** Incidents opened by threat detection or critical risk: contain, review, resolve. */
export function IncidentsPanel({ onChanged }: { onChanged?: () => void }): JSX.Element {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'open' | 'resolved' | ''>('open');
  const [items, setItems] = useState<AgentIncident[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(searchParams.get('incident'));

  const load = useCallback(async () => {
    try {
      setItems(await agentsApi.incidents(filter || undefined));
    } catch (error) {
      setItems([]);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  }, [filter, showToast]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  useEffect(() => {
    const linked = searchParams.get('incident');
    if (!linked) return;
    setOpenId(linked);
    const next = new URLSearchParams(searchParams);
    next.delete('incident');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-3" data-testid="incidents-panel">
      <div className="flex flex-wrap gap-1.5">
        {[
          { value: 'open' as const, label: 'Open' },
          { value: 'resolved' as const, label: 'Resolved' },
          { value: '' as const, label: 'All' }
        ].map((item) => (
          <button
            aria-pressed={filter === item.value}
            className={cn('h-8 rounded-md border px-3 text-[13px]', filter === item.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
            key={item.label}
            onClick={() => setFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {items == null ? (
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
      ) : items.length === 0 ? (
        <EmptyState
          description="Critical threats and critical-risk actions open an incident here, and the agent is suspended until a person reviews it."
          icon={Siren}
          title={filter === 'open' ? 'No open incidents' : 'No incidents'}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="m-0 list-none divide-y divide-slate-100 p-0">
            {items.map((incident) => (
              <li key={incident.id}>
                <button className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50" data-testid="incident-row" onClick={() => setOpenId(incident.id)} type="button">
                  <ShieldAlert className={cn('mt-0.5 h-4 w-4 shrink-0', incident.severity === 'critical' ? 'text-red-600' : 'text-amber-600')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-slate-900">{incident.title}</span>
                    <span className="block text-xs text-slate-500">
                      {TRIGGER_LABEL[incident.trigger] ?? incident.trigger} · {incident.agents.map((a) => a.name).join(', ')} · {timeAgo(incident.createdAt)}
                    </span>
                  </span>
                  <Badge tone={STATUS_TONE[incident.status]}>{incident.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {openId ? (
        <IncidentDetail
          id={openId}
          onChanged={() => {
            void load();
            onChanged?.();
          }}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function IncidentDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [incident, setIncident] = useState<AgentIncidentDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reapproval, setReapproval] = useState(true);

  const load = useCallback(async () => {
    try {
      setIncident(await agentsApi.incident(id));
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      onClose();
    }
  }, [id, onClose, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (key: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await fn();
      showToast({ variant: 'success', message });
      await load();
      onChanged();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const open = incident && incident.status !== 'resolved';
  return (
    <Modal description={incident ? `${TRIGGER_LABEL[incident.trigger] ?? incident.trigger} · ${incident.status}` : undefined} maxWidth="max-w-3xl" onClose={onClose} title={incident?.title ?? 'Incident'}>
      {!incident ? (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <div className="grid gap-4" data-testid="incident-detail">
          <p className="m-0 text-[13px] text-slate-700">{incident.summary}</p>
          <div className="flex flex-wrap gap-2">
            {incident.agents.map((agent) => (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs" key={agent.id}>
                <span className="font-medium text-slate-900">{agent.name}</span>
                <Badge tone={agent.status === 'active' ? 'success' : agent.status === 'suspended' ? 'warning' : 'danger'}>{agent.status}</Badge>
              </span>
            ))}
          </div>

          {open ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3" data-testid="incident-actions">
              <div className="text-[13px] font-medium text-slate-900">Respond</div>
              <Checkbox
                checked={reapproval}
                description="The agent's next change waits for a person before it can act on its own again."
                label="Require re-approval when resuming"
                onChange={(e) => setReapproval(e.target.checked)}
              />
              <div className="flex flex-wrap gap-2">
                <Button icon={Play} loading={busy === 'resume'} onClick={() => void act('resume', () => agentsApi.incidentAction(id, 'resume', { requireReapproval: reapproval }), 'Resumed: closed as a false positive')} size="sm">
                  Resume (false positive)
                </Button>
                <Button
                  icon={OctagonX}
                  loading={busy === 'revoke'}
                  onClick={async () => {
                    const ok = await confirm({ title: 'Revoke permanently?', message: 'The agents lose access for good and their keys stop working.', confirmText: 'Revoke', type: 'danger' });
                    if (ok) await act('revoke', () => agentsApi.incidentAction(id, 'revoke'), 'Agents revoked; incident closed');
                  }}
                  size="sm"
                  variant="danger"
                >
                  Revoke key permanently
                </Button>
                <Button loading={busy === 'resolve'} onClick={() => void act('resolve', () => agentsApi.incidentAction(id, 'resolve'), 'Incident resolved')} size="sm" variant="secondary">
                  Resolve
                </Button>
              </div>
            </div>
          ) : (
            <p className="m-0 rounded-lg bg-green-50 px-3 py-2 text-[13px] text-green-800">Resolved{incident.resolution ? `: ${incident.resolution.replace('_', ' ')}` : ''}.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button icon={Download} loading={busy === 'export'} onClick={() => void act('export', () => agentsApi.downloadIncidentEvidence(id), 'Evidence exported')} size="sm" variant="secondary">
              Export evidence
            </Button>
            <Button icon={Send} loading={busy === 'notify'} onClick={() => void act('notify', () => agentsApi.incidentAction(id, 'notify'), 'Sent to your webhooks')} size="sm" variant="secondary">
              Notify via webhooks
            </Button>
          </div>

          {incident.relatedAgents.length && open ? (
            <div className="grid gap-1.5">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900">
                <Users size={14} /> Related agents (same owners)
              </div>
              <div className="flex flex-wrap gap-2">
                {incident.relatedAgents.map((agent) => (
                  <Button
                    key={agent.id}
                    loading={busy === `expand-${agent.id}`}
                    onClick={() => void act(`expand-${agent.id}`, () => agentsApi.incidentAction(id, 'expand', { agentIds: [agent.id] }), `${agent.name} added to the investigation`)}
                    size="sm"
                    variant="ghost"
                  >
                    + {agent.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {incident.suggestions.length ? (
            <div className="grid gap-1">
              <div className="text-[13px] font-medium text-slate-900">To prevent it happening again</div>
              <ul className="m-0 list-disc space-y-0.5 pl-5 text-[13px] text-slate-700">
                {incident.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-1">
            <div className="text-[13px] font-medium text-slate-900">Timeline</div>
            <ol className="m-0 grid list-none gap-1.5 border-l border-slate-200 p-0 pl-3" data-testid="incident-timeline">
              {[...incident.timeline].reverse().map((entry, index) => (
                <li className="text-[13px]" key={`${entry.at}-${index}`}>
                  <span className={cn('mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium', entry.actor === 'system' ? 'bg-slate-100 text-slate-700' : 'bg-brand-50 text-brand-700')}>
                    {entry.actor === 'system' ? 'System decided' : 'Person'}
                  </span>
                  <span className="text-slate-800">{entry.detail || entry.action}</span>
                  <span className="ml-1.5 text-xs text-slate-500">{timeAgo(entry.at)}</span>
                </li>
              ))}
            </ol>
          </div>

          {incident.activity.length ? (
            <div className="grid gap-1">
              <div className="text-[13px] font-medium text-slate-900">Agent activity in the incident window ({incident.activity.length})</div>
              <ul className="m-0 max-h-56 list-none divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200 p-0">
                {incident.activity.slice(0, 50).map((row) => (
                  <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs" key={row.id}>
                    <code className="font-mono text-slate-900">{row.action}</code>
                    <span className="text-slate-500">
                      {row.outcome}
                      {row.decidedBy === 'system' ? ' · System decided' : ''} · {timeAgo(row.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
