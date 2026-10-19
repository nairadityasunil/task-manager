import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIntegration,
  updateIntegration,
  regenerateKey,
  disableIntegration,
  enableIntegration,
  deleteIntegration,
  type SdkIntegration,
  type SdkEnvironment
} from '@/lib/sdk-integrations/api';
import EngagementPage from './EngagementPage';
import EventTrackingPage from './EventTrackingPage';
import SdkSetupGuide from '@/features/sdk-integrations/components/SdkSetupGuide';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Globe,
  KeyRound,
  Pencil,
  RefreshCw,
  Settings,
  ShieldAlert,
  Target,
  Trash2,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Tabs, cn, inputClass, selectClass, textareaClass, type BadgeTone } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';

const SdkIntegrationDetailPage: React.FC = () => {
  const { integrationId, tab } = useParams<{ integrationId: string; tab?: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [integration, setIntegration] = useState<SdkIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editEnvironment, setEditEnvironment] = useState<SdkEnvironment>('development');
  const [editAllowedOrigins, setEditAllowedOrigins] = useState<string>('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const activeTab = tab || 'overview';

  const loadData = async () => {
    if (!integrationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIntegration(integrationId);
      setIntegration(data);
      // Initialize edit fields
      setEditName(data.name);
      setEditDomain(data.domain);
      setEditEnvironment(data.environment);
      setEditAllowedOrigins(data.allowedOrigins.join(', '));
      setEditDescription(data.description || '');
    } catch (err) {
      console.error('Failed to load integration details', err);
      setError('Failed to load integration details.');
    } finally {
      setLoading(false);
    }
  };

  // Re-reads connection status without the full-page loading state.
  const refreshIntegration = async () => {
    if (!integrationId) return;
    try {
      setIntegration(await getIntegration(integrationId));
    } catch {
      // The API client already reports the error.
    }
  };

  useEffect(() => {
    if (integrationId) {
      localStorage.setItem('active_sdk_integration_id', integrationId);
      window.dispatchEvent(new CustomEvent('sync:active-integration-changed', { detail: { id: integrationId } }));
    }
    loadData();
  }, [integrationId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!integrationId) return;
    const isConfirmed = await confirm({
      title: 'Regenerate SDK Key',
      message: 'Are you sure you want to regenerate the SDK Key? Any existing applications using the old key will lose access immediately.',
      confirmText: 'Regenerate',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await regenerateKey(integrationId);
      setNewKey(res.sdkKey);
      if (integration) {
        setIntegration({ ...integration, sdkKeyMasked: res.integration.sdkKeyMasked });
      }
    } catch (err) {
      console.error('Failed to regenerate key', err);
      alert('Failed to regenerate SDK key.');
    }
  };

  const handleToggleStatus = async () => {
    if (!integration || !integrationId) return;
    try {
      let updated: SdkIntegration;
      if (integration.status === 'disabled') {
        updated = await enableIntegration(integrationId);
      } else {
        const isConfirmed = await confirm({
          title: 'Disable SDK Integration',
          message: 'Disabling this SDK Integration will block all requests from it. Users will not see guides or surveys. Are you sure?',
          confirmText: 'Disable',
          type: 'danger'
        });
        if (!isConfirmed) return;
        updated = await disableIntegration(integrationId);
      }
      setIntegration(updated);
    } catch (err) {
      console.error('Failed to toggle integration status', err);
      alert('Failed to update integration status.');
    }
  };

  const handleDelete = async () => {
    if (!integrationId) return;
    const isConfirmed = await confirm({
      title: 'Delete SDK Integration',
      message: 'This action is permanent. All guides, surveys, and logs associated with this integration will be permanently deleted. Are you sure?',
      confirmText: 'Delete Permanently',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await deleteIntegration(integrationId);
      navigate('/sdk-integrations');
    } catch (err) {
      console.error('Failed to delete integration', err);
      alert('Failed to delete SDK integration.');
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!integrationId) return;
    setSaving(true);
    try {
      const origins = editAllowedOrigins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await updateIntegration(integrationId, {
        name: editName,
        domain: editDomain,
        environment: editEnvironment,
        allowedOrigins: origins,
        description: editDescription
      });
      setIntegration(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save integration details', err);
      alert('Failed to update SDK integration details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 pb-5 pt-5 sm:px-6 lg:px-8">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-7 w-56 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-md justify-items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </span>
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">Integration Not Found</h3>
          <p className="m-0 text-sm text-slate-500">{error || 'The requested SDK integration could not be loaded.'}</p>
          <Button className="mt-2" variant="primary" onClick={() => navigate('/sdk-integrations')}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const statusTone: Record<SdkIntegration['status'], BadgeTone> = {
    pending: 'warning',
    connected: 'success',
    disabled: 'neutral',
    revoked: 'danger'
  };

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : 'Never');
  const labelCls = 'text-xs text-slate-500';

  return (
    <div className="min-h-full bg-slate-50">
      {/* Detail Header */}
      <div className="border-b border-slate-200 bg-white px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <button
          onClick={() => navigate('/sdk-integrations')}
          type="button"
          className="-ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-1 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={14} /> All integrations
        </button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 sm:flex">
              <Globe size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{integration.name}</h1>
                <Badge className="capitalize" dot tone={statusTone[integration.status]}>{integration.status}</Badge>
                <Badge className="capitalize">{integration.environment}</Badge>
              </div>
              <p className="m-0 mt-1 truncate text-sm text-slate-500">
                Target: <span className="font-mono text-[13px] text-slate-700">{integration.domain}</span>
              </p>
            </div>
          </div>
        </div>
        <Tabs
          items={[
            { value: 'overview', label: 'Overview', icon: Settings },
            { value: 'guides', label: 'Guides', icon: BookOpen },
            { value: 'surveys', label: 'Surveys', icon: Target },
            { value: 'events', label: 'Events', icon: Activity }
          ]}
          value={activeTab}
          onChange={(next) => navigate(`/sdk-integrations/${integration.id}/${next}`)}
        />
      </div>

      {/* Tab Panels */}
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="mb-6">
            <SdkSetupGuide
              integration={integration}
              onOpenDocs={() => navigate('/sdk-docs')}
              onOpenTab={(target) => navigate(`/sdk-integrations/${integration.id}/${target}`)}
              onRefresh={refreshIntegration}
            />
          </div>
        )}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            {/* Left 2 Columns: Config & Keys */}
            <div className="grid content-start gap-4 lg:col-span-2 lg:gap-6">
              {/* SDK Key Panel */}
              <Card>
                <CardHeader
                  title="Integration SDK Key"
                  description="Used by the SDK to identify this app. Regenerating it stops the old key immediately."
                />
                <div className="grid gap-4 p-4 sm:p-5">
                  {newKey ? (
                    <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                          <AlertTriangle className="h-4 w-4" />
                          Copy your new SDK Key
                        </div>
                        <p className="m-0 mt-1 text-[13px] text-amber-800">
                          This key will only be shown once. Copy it now and store it securely.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white py-1 pl-3 pr-1">
                        <code className="min-w-0 flex-1 select-all break-all font-mono text-[13px] text-slate-800">{newKey}</code>
                        <Button
                          aria-label="Copy Key"
                          onClick={() => handleCopy(newKey)}
                          size="icon-sm"
                          variant="ghost"
                          title="Copy Key"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-3 pr-1">
                      <KeyRound size={14} className="shrink-0 text-slate-400" />
                      <code className="min-w-0 flex-1 select-none break-all font-mono text-[13px] text-slate-600">{integration.sdkKeyMasked}</code>
                      <Button
                        aria-label="Masked Key cannot be copied"
                        onClick={() => handleCopy(integration.sdkKeyMasked)}
                        disabled={true}
                        size="icon-sm"
                        variant="ghost"
                        title="Masked Key cannot be copied"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button icon={RefreshCw} onClick={handleRegenerateKey}>
                      Regenerate Key
                    </Button>
                    {newKey && (
                      <Button variant="primary" onClick={() => setNewKey(null)}>
                        Done Viewing
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Edit Details Form */}
              <Card>
                <CardHeader
                  title="Configuration Details"
                  description="Where the SDK is allowed to run."
                  actions={!isEditing ? (
                    <Button size="sm" icon={Pencil} onClick={() => setIsEditing(true)}>
                      Edit Configuration
                    </Button>
                  ) : undefined}
                />

                <div className="p-4 sm:p-5">
                  {isEditing ? (
                    <form onSubmit={handleSaveChanges} className="grid gap-4">
                      <Field label="Integration name">
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Primary domain">
                          <input
                            type="text"
                            required
                            value={editDomain}
                            onChange={(e) => setEditDomain(e.target.value)}
                            placeholder="example.com"
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Environment">
                          <select
                            value={editEnvironment}
                            onChange={(e) => setEditEnvironment(e.target.value as SdkEnvironment)}
                            className={selectClass}
                          >
                            <option value="development">Development</option>
                            <option value="staging">Staging</option>
                            <option value="production">Production</option>
                          </select>
                        </Field>
                      </div>

                      <Field label="Allowed CORS origins" hint="Comma-separated URLs.">
                        <input
                          type="text"
                          value={editAllowedOrigins}
                          onChange={(e) => setEditAllowedOrigins(e.target.value)}
                          placeholder="http://localhost:3000, https://staging.example.com"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Description">
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className={cn(textareaClass, 'resize-none')}
                        />
                      </Field>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button type="submit" variant="primary" loading={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={() => {
                            setIsEditing(false);
                            loadData();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <dl className="m-0 grid gap-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="min-w-0">
                          <dt className={labelCls}>Primary domain</dt>
                          <dd className="m-0 mt-0.5 truncate text-sm font-medium text-slate-900">{integration.domain}</dd>
                        </div>
                        <div>
                          <dt className={labelCls}>Environment</dt>
                          <dd className="m-0 mt-0.5 text-sm font-medium capitalize text-slate-900">{integration.environment}</dd>
                        </div>
                      </div>

                      <div>
                        <dt className={labelCls}>Allowed origins</dt>
                        <dd className="m-0 mt-1.5 flex flex-wrap gap-1.5">
                          {integration.allowedOrigins.length > 0 ? (
                            integration.allowedOrigins.map((origin) => (
                              <span key={origin} className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700">
                                {origin}
                              </span>
                            ))
                          ) : (
                            <span className="text-[13px] text-slate-500">Only matching primary domain requests allowed</span>
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className={labelCls}>Description</dt>
                        <dd className="m-0 mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{integration.description || 'No description provided.'}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Connection Diagnostics & Control */}
            <div className="grid content-start gap-4 lg:gap-6">
              {/* Health Diagnostics Panel */}
              <Card>
                <CardHeader title="Diagnostics &amp; Health" description="Latest signals from the SDK." />
                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="text-[13px] text-slate-600">Connections (all-time)</span>
                    <span className="text-xl font-semibold tracking-tight text-slate-900">{integration.connectionCount}</span>
                  </div>

                  <dl className="m-0 divide-y divide-slate-100">
                    {[
                      { label: 'SDK client version', value: integration.sdkVersion || 'Not connected' },
                      { label: 'Latest active origin', value: integration.latestOrigin || '—', mono: true },
                      { label: 'First registered', value: fmt(integration.firstConnectedAt) },
                      { label: 'Last live connect', value: fmt(integration.lastConnectedAt) },
                      { label: 'Last heartbeat', value: fmt(integration.lastHeartbeatAt) },
                      { label: 'Last setup fetch', value: fmt(integration.lastRuntimeRequestAt) },
                      { label: 'Last logged event', value: fmt(integration.lastEventRequestAt) },
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="flex items-center justify-between gap-3 py-2.5">
                        <dt className="shrink-0 text-[13px] text-slate-500">{label}</dt>
                        <dd className={`m-0 min-w-0 truncate text-right text-[13px] ${mono ? 'font-mono text-slate-600' : 'text-slate-800'}`} title={String(value)}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader className="border-red-100" title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-600" />Danger Zone</span>} />
                <div className="grid gap-3 p-4 sm:p-5">
                  <p className="m-0 text-[13px] leading-relaxed text-slate-600">
                    Temporarily disable administrative operations or permanently delete this entire integration context.
                  </p>
                  <Button
                    className="w-full"
                    icon={integration.status === 'disabled' ? Play : Pause}
                    onClick={handleToggleStatus}
                    variant={integration.status === 'disabled' ? 'accent' : 'secondary'}
                  >
                    {integration.status === 'disabled' ? 'Enable Integration' : 'Disable Integration'}
                  </Button>
                  <Button className="w-full" icon={Trash2} onClick={handleDelete} variant="danger">
                    Delete Integration
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'guides' && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-slate-900">Guides</h2>
              <p className="m-0 mt-0.5 text-[13px] text-slate-500">Tours, modals, tips, hotspots and banners shown in this app.</p>
            </div>
            <EngagementPage sdkIntegrationId={integrationId} defaultTab="guides" hideHeader={true} />
          </div>
        )}

        {activeTab === 'surveys' && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-slate-900">Surveys</h2>
              <p className="m-0 mt-0.5 text-[13px] text-slate-500">Feedback and NPS surveys shown to users of this app.</p>
            </div>
            <EngagementPage sdkIntegrationId={integrationId} defaultTab="surveys" hideHeader={true} />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <div>
              <h2 className="m-0 text-[15px] font-semibold text-slate-900">Events</h2>
              <p className="m-0 mt-0.5 text-[13px] text-slate-500">Everything this app sends through the SDK. Click an event to see its payload.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <EventTrackingPage sdkIntegrationId={integrationId} hideHeader={true} onOpenDocs={() => navigate('/sdk-docs')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SdkIntegrationDetailPage;
