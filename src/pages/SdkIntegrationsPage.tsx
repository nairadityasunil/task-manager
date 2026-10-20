import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Copy, Eye, EyeOff, Globe,
  KeyRound, Plus, RefreshCw, Search, Server,
  Trash2, WifiOff, Zap, ChevronDown, ChevronRight, Code2,
  Settings, BookOpen, Target, Activity, Plug, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SdkIntegration, SdkEnvironment } from '@/lib/sdk-integrations/api';
import {
  listIntegrations, createIntegration, regenerateKey,
  disableIntegration, enableIntegration, deleteIntegration
} from '@/lib/sdk-integrations/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Badge, Button, Field, IconTile, StatCard, cn, inputClass, selectClass, textareaClass, type BadgeTone, type TileTone } from '@/components/ui';

// ---------- helpers ----------
const ENV_LABELS: Record<SdkEnvironment, string> = { development: 'Development', staging: 'Staging', production: 'Production' };
const STATUS_META: Record<SdkIntegration['status'], { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  connected: { label: 'Connected', tone: 'success' },
  disabled: { label: 'Disabled', tone: 'neutral' },
  revoked: { label: 'Revoked', tone: 'danger' },
};

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (d?: string | null) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => { void navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <button
      onClick={copy}
      type="button"
      className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900', className)}
    >
      {done ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Centered dialog shell used by the modals on this page. */
function DialogShell({ title, description, icon, onClose, onBackdrop, children, footer, maxWidth = 'max-w-lg' }: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  onBackdrop?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" onClick={onBackdrop}>
      <div className={cn('flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl', maxWidth)} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">{icon}</span>}
            <div className="min-w-0">
              <h2 className="m-0 text-base font-semibold text-slate-900">{title}</h2>
              {description && <p className="m-0 mt-0.5 text-[13px] text-slate-500">{description}</p>}
            </div>
          </div>
          {onClose && (
            <button aria-label="Close" onClick={onClose} type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Create modal ----------
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState('');
  const [env, setEnv] = useState<SdkEnvironment>('production');
  const [domain, setDomain] = useState('');
  const [origins, setOrigins] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !domain.trim()) { setErr('Name and domain are required.'); return; }
    setLoading(true); setErr(null);
    try {
      const allowedOrigins = origins
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      const { sdkKey } = await createIntegration({
        name,
        environment: env,
        domain,
        allowedOrigins,
        description: desc,
      });
      onCreated(sdkKey);
    } catch { setErr('Failed to create integration.'); } finally { setLoading(false); }
  };

  return (
    <DialogShell
      title="New SDK Integration"
      description="Connect an external website to the Engagement Platform"
      icon={<Globe size={17} />}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={() => void submit()} loading={loading} variant="primary">Create Integration</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0" />{err}
          </div>
        )}
        <Field label="Integration name">
          <input className={inputClass} placeholder="e.g. Production Website" value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
          <Field label="Environment">
            <select className={selectClass} value={env} onChange={e => setEnv(e.target.value as SdkEnvironment)}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </Field>
          <Field label="Application URL">
            <input className={inputClass} placeholder="https://app.company.com" value={domain} onChange={e => setDomain(e.target.value)} />
          </Field>
        </div>
        <Field label="Additional allowed origins" hint="Optional. Separate multiple origins with commas.">
          <input className={inputClass} placeholder="https://origin2.com, http://localhost:5173" value={origins} onChange={e => setOrigins(e.target.value)} />
        </Field>
        <Field label="Description" hint="Optional.">
          <textarea className={cn(textareaClass, 'h-20 resize-none')} placeholder="Brief description of this integration" value={desc} onChange={e => setDesc(e.target.value)} />
        </Field>
      </div>
    </DialogShell>
  );
}

// ---------- Key reveal modal ----------
function KeyRevealModal({ sdkKey, name, onClose }: { sdkKey: string; name: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <DialogShell
      title="SDK Key Generated"
      description={<>For <span className="font-medium text-slate-700">{name}</span></>}
      icon={<KeyRound size={17} className="text-emerald-600" />}
      maxWidth="max-w-md"
      footer={<Button onClick={onClose} variant="primary">Done</Button>}
    >
      <div className="grid gap-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>This key will not be shown again. Copy it now and store it securely.</span>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">Public SDK key</span>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-3 pr-1">
            <code className="min-w-0 flex-1 break-all py-1 font-mono text-[13px] text-slate-800">{visible ? sdkKey : `${sdkKey.slice(0, 8)}${'•'.repeat(32)}`}</code>
            <button
              aria-label={visible ? 'Hide key' : 'Show key'}
              onClick={() => setVisible(!visible)}
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <CopyBtn text={sdkKey} />
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

// ---------- Install guide ----------
function InstallGuide({ integration }: { integration: SdkIntegration }) {
  const [open, setOpen] = useState(false);
  const masked = integration.sdkKeyMasked;
  const code = 'overflow-auto rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100';
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        onClick={() => setOpen(!open)} type="button"
      >
        <span className="flex items-center gap-2"><Code2 size={15} className="text-slate-400" />SDK Installation Guide</span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div className="grid gap-4 border-t border-slate-200 bg-white p-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">1. Install the SDK</p>
            <pre className={code}>{`npm install @engagement/sdk`}</pre>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">2. Initialize</p>
            <pre className={code}>{`import { EngagementSDK } from '@engagement/sdk';

EngagementSDK.init({
  sdkKey: '${masked}',
});`}</pre>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">3. Identify user (optional)</p>
            <pre className={code}>{`EngagementSDK.identify({ userId: 'user-123', role: 'admin' });`}</pre>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
            <span className="font-medium">Domain:</span> {integration.domain} &nbsp;·&nbsp; <span className="font-medium">Environment:</span> {integration.environment}
          </div>
        </div>
      )}
    </div>
  );
}

const SECTION_LINKS = [
  { label: 'Overview', icon: Settings, tab: 'overview' },
  { label: 'Guides', icon: BookOpen, tab: 'guides' },
  { label: 'Surveys', icon: Target, tab: 'surveys' },
  { label: 'Events', icon: Activity, tab: 'events' },
];

// ---------- Details modal ----------
function DetailsModal({ integration, onClose, onRefresh }: { integration: SdkIntegration; onClose: () => void; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await onRefresh(); } finally { setBusy(false); } };
  return (
    <>
      <DialogShell title={integration.name} description={integration.domain} icon={<Plug size={17} />} onClose={onClose} onBackdrop={onClose}>
        <div className="grid gap-4">
          <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            {[
              { label: 'First connected', value: fmtTime(integration.firstConnectedAt) },
              { label: 'Last runtime', value: fmtTime(integration.lastRuntimeRequestAt) },
              { label: 'Last event', value: fmtTime(integration.lastEventRequestAt) },
              { label: 'Last heartbeat', value: fmtTime(integration.lastHeartbeatAt) },
              { label: 'Created', value: fmtDate(integration.createdAt) },
              { label: 'Latest origin', value: integration.latestOrigin ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0 bg-white px-3 py-2.5">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="m-0 mt-0.5 truncate text-[13px] font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {integration.allowedOrigins?.length > 0 && (
            <div className="rounded-lg border border-slate-200 px-3 py-2.5">
              <p className="m-0 text-xs text-slate-500">Allowed origins</p>
              <p className="m-0 mt-0.5 break-all text-[13px] text-slate-800">{integration.allowedOrigins.join(', ')}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {SECTION_LINKS.map(({ label, icon: Icon, tab }) => (
              <button key={label} onClick={() => { onClose(); navigate(`/sdk-integrations/${integration.id}/${tab}`); }} type="button"
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                <Icon size={15} className="text-slate-400" />{label}
              </button>
            ))}
          </div>
          <InstallGuide integration={integration} />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button size="sm" icon={RefreshCw} onClick={() => act(async () => { const { sdkKey } = await regenerateKey(integration.id); setNewKey(sdkKey); })} disabled={busy}>
              Regenerate Key
            </Button>
            {integration.status === 'disabled'
              ? <Button size="sm" icon={Zap} onClick={() => act(() => enableIntegration(integration.id))} disabled={busy}>Enable</Button>
              : <Button size="sm" icon={WifiOff} onClick={() => act(() => disableIntegration(integration.id))} disabled={busy || integration.status === 'revoked'}>Disable</Button>
            }
            <Button size="sm" variant="danger" icon={Trash2} className="ml-auto" onClick={() => { if (window.confirm(`Delete "${integration.name}"?`)) void act(() => deleteIntegration(integration.id)); }} disabled={busy}>
              Delete
            </Button>
          </div>
        </div>
      </DialogShell>
      {newKey && <KeyRevealModal sdkKey={newKey} name={integration.name} onClose={() => setNewKey(null)} />}
    </>
  );
}

// ---------- Integration card ----------
function IntegrationCard({ integration, onRefresh }: { integration: SdkIntegration; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const sm = STATUS_META[integration.status];
  const inactive = integration.status === 'disabled' || integration.status === 'revoked';

  return (
    <>
      {showDetails && <DetailsModal integration={integration} onClose={() => setShowDetails(false)} onRefresh={onRefresh} />}
      <div
        className="card-hover group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20"
        onClick={() => navigate(`/sdk-integrations/${integration.id}/overview`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && navigate(`/sdk-integrations/${integration.id}/overview`)}
      >
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <IconTile icon={Globe} size="lg" tone={inactive ? 'slate' : 'teal'} />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700" title={integration.name}>{integration.name}</h3>
              <p className="m-0 mt-0.5 truncate text-[13px] text-slate-500">{integration.domain}</p>
            </div>
            <Badge tone={sm.tone} dot>{sm.label}</Badge>
          </div>
          {integration.description && <p className="m-0 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{integration.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={integration.environment === 'production' ? 'dark' : 'neutral'}>{ENV_LABELS[integration.environment]}</Badge>
          </div>

          <dl className="m-0 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2">
            {[
              { label: 'Connections', value: integration.connectionCount },
              { label: 'Last active', value: integration.lastConnectedAt ? fmtDate(integration.lastConnectedAt) : 'Never' },
              { label: 'SDK version', value: integration.sdkVersion ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="truncate text-[11px] text-slate-500">{label}</dt>
                <dd className="m-0 truncate text-xs font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <Button size="sm" onClick={() => setShowDropdown(!showDropdown)}>
                Configure <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </Button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {SECTION_LINKS.map(({ label, icon: Icon, tab }) => (
                      <button key={label} onClick={() => { setShowDropdown(false); navigate(`/sdk-integrations/${integration.id}/${tab}`); }} type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                        <Icon size={14} className="text-slate-400" />{label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setShowDetails(true)}>
              Details <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 py-1 pl-4 pr-2" onClick={e => e.stopPropagation()}>
          <KeyRound size={13} className="shrink-0 text-slate-400" />
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">{integration.sdkKeyMasked}</code>
          <CopyBtn text={integration.sdkKeyMasked} />
        </div>
      </div>
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid flex-1 gap-1.5">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
      <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

// ---------- Main page ----------
export default function SdkIntegrationsPage() {
  const [integrations, setIntegrations] = useState<SdkIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterEnv, setFilterEnv] = useState<SdkEnvironment | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SdkIntegration['status'] | 'all'>('all');

  const load = async () => {
    setLoading(true);
    try { setIntegrations(await listIntegrations()); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = integrations.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.domain.toLowerCase().includes(search.toLowerCase());
    const matchEnv = filterEnv === 'all' || i.environment === filterEnv;
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchEnv && matchStatus;
  });

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'connected').length,
    pending: integrations.filter(i => i.status === 'pending').length,
    disabled: integrations.filter(i => i.status === 'disabled' || i.status === 'revoked').length,
  };

  return (
    <div className="min-h-full bg-slate-50">
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(key) => {
            setShowCreate(false);
            void load().then(() => {
              setNewKey({ key, name: 'New Integration' });
            });
          }}
        />
      )}
      {newKey && <KeyRevealModal sdkKey={newKey.key} name={newKey.name} onClose={() => setNewKey(null)} />}

      <PageHeader
        title="SDK Integrations"
        description="Connect your apps, manage SDK keys and allowed origins."
        icon={Plug}
        tone="teal"
        actions={<Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>New integration</Button>}
      />

      <div className="grid gap-4 px-3 py-4 sm:px-5 lg:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total', value: stats.total, icon: Globe, tone: 'teal' as TileTone, hint: 'Apps and environments' },
            { label: 'Connected', value: stats.connected, icon: CheckCircle2, tone: 'emerald' as TileTone, hint: 'Receiving events' },
            { label: 'Pending', value: stats.pending, icon: Clock, tone: 'amber' as TileTone, hint: 'Waiting for first event' },
            { label: 'Inactive', value: stats.disabled, icon: WifiOff, tone: 'slate' as TileTone, hint: 'Disabled or revoked' },
          ].map(({ label, value, icon, tone, hint }) => (
            <StatCard hint={hint} icon={icon} key={label} label={label} tone={tone} value={loading ? '–' : value} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={cn(inputClass, 'pl-9')}
              placeholder="Search integrations…" value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
          <select aria-label="Environment" className={selectClass} value={filterEnv} onChange={e => setFilterEnv(e.target.value as typeof filterEnv)}>
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          </div>
          <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
          <select aria-label="Status" className={selectClass} value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="connected">Connected</option>
            <option value="disabled">Disabled</option>
            <option value="revoked">Revoked</option>
          </select>
          </div>
          <span className="ml-auto hidden text-[13px] text-slate-500 sm:inline">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Content */}
        {loading ? (
          <div aria-busy="true" aria-label="Loading integrations…" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Server}
            title={integrations.length === 0 ? 'No integrations yet' : 'No results'}
            description={integrations.length === 0
              ? 'Create your first SDK integration to connect an external website to the Engagement Platform.'
              : 'Try adjusting your search or filters.'}
            action={integrations.length === 0 ? (
              <Button variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>Create Integration</Button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtered.map(i => (
              <IntegrationCard key={i.id} integration={i} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
