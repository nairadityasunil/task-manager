import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Download, Gauge, RefreshCw, ShieldCheck, Siren } from 'lucide-react';

import { Button, Card, CardHeader, DateInput, Field, Input, Select, Switch, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { agentsApi, type ComplianceReport, type GovernanceSettings, type HybridGovernance } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const MODES: Array<{ value: HybridGovernance['mode']; label: string; detail: string }> = [
  { value: 'auto_low_risk', label: 'Enforce + auto low-risk', detail: 'Low-risk actions run on their own; medium and high risk wait for a person; critical is blocked and the agent suspended.' },
  { value: 'full_enforce', label: 'Full enforce', detail: 'Every change waits for a person unless a policy allows it. Reads are allowed.' },
  { value: 'advisory', label: 'Advisory', detail: 'Nothing is blocked by the default rule; what it would have done is logged and recommended.' }
];

/** How the system decides on its own: default rule, auto-approve, safety nets, DLP and compliance settings. */
export function HybridGovernanceCard({
  settings,
  workspaceId,
  onChange
}: {
  settings: GovernanceSettings;
  workspaceId: string | null;
  onChange: (next: GovernanceSettings) => void;
}): JSX.Element {
  const { showToast } = useToast();
  const g = settings.governance;
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState(g.allowedDataRegions.join(', '));

  const save = async (patch: Partial<HybridGovernance>, message: string) => {
    setSaving(true);
    try {
      onChange(await agentsApi.updateSettings({ governance: patch }, workspaceId));
      showToast({ variant: 'success', message });
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const row = (label: string, detail: string, control: JSX.Element) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
      <div className="min-w-0 flex-1 basis-60">
        <div className="text-[13px] font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
      {control}
    </div>
  );

  return (
    <Card data-testid="hybrid-governance">
      <CardHeader
        description="Low-risk things happen automatically. High-risk things wait for a person. Everything is logged."
        icon={<Gauge className="h-4 w-4 text-slate-400" />}
        title="Hybrid governance"
      />
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-2 text-[13px] font-medium text-slate-900">When no policy matches an agent action</div>
        <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Governance mode">
          {MODES.map((mode) => (
            <button
              aria-checked={g.mode === mode.value}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                g.mode === mode.value ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
              )}
              data-testid={`mode-${mode.value}`}
              disabled={saving}
              key={mode.value}
              onClick={() => g.mode !== mode.value && void save({ mode: mode.value }, `Governance mode: ${mode.label}`)}
              role="radio"
              type="button"
            >
              <div className="text-[13px] font-medium text-slate-900">{mode.label}</div>
              <div className="mt-0.5 text-xs text-slate-600">{mode.detail}</div>
            </button>
          ))}
        </div>
      </div>
      {row(
        'Auto-approve repeats',
        'When a person approved the same action for the same agent recently, approve it again automatically ("System decided").',
        <Select
          aria-label="Auto-approve repeats"
          className="w-40"
          disabled={saving}
          onValueChange={(value) => void save({ autoApproveRepeatDays: Number(value) }, Number(value) ? `Repeats approved within ${value} days run automatically` : 'Auto-approve is off')}
          options={[
            { value: '0', label: 'Off' },
            { value: '1', label: 'Within 1 day' },
            { value: '7', label: 'Within 7 days' },
            { value: '30', label: 'Within 30 days' }
          ]}
          value={String(g.autoApproveRepeatDays)}
        />
      )}
      {row(
        'Auto-suspend on critical risk',
        'Critical-risk actions are blocked and the agent suspended until a person resumes it.',
        <Switch aria-label="Auto-suspend on critical risk" checked={g.criticalAutoSuspend} disabled={saving} onChange={() => void save({ criticalAutoSuspend: !g.criticalAutoSuspend }, 'Saved')} />
      )}
      {row(
        'Threat detection',
        'Key abuse, privilege escalation, rapid listing, exfiltration and bulk deletes raise alerts and risk.',
        <Switch aria-label="Threat detection" checked={g.threatDetection} disabled={saving} onChange={() => void save({ threatDetection: !g.threatDetection }, 'Saved')} />
      )}
      {row(
        'Contain critical threats',
        'Open an incident and suspend the agent at once; a person resumes or revokes it.',
        <Switch aria-label="Contain critical threats" checked={g.incidentAutoContain} disabled={saving} onChange={() => void save({ incidentAutoContain: !g.incidentAutoContain }, 'Saved')} />
      )}
      {row(
        'Data loss prevention',
        'Scan what agents send and AI prompts for secrets and personal data. Enforce blocks secrets and holds personal data leaving Pristine.',
        <Select
          aria-label="Data loss prevention"
          className="w-48"
          disabled={saving}
          onValueChange={(value) => void save({ dlpMode: value as HybridGovernance['dlpMode'] }, `DLP: ${value}`)}
          options={[
            { value: 'enforce', label: 'Enforce' },
            { value: 'monitor', label: 'Monitor only' },
            { value: 'off', label: 'Off' }
          ]}
          value={g.dlpMode}
        />
      )}
      {row(
        'Maximum agent key age',
        'Older keys fail compliance; with enforcement on they may only read until rotated.',
        <Select
          aria-label="Maximum agent key age"
          className="w-40"
          disabled={saving}
          onValueChange={(value) => void save({ keyMaxAgeDays: Number(value) }, 'Saved')}
          options={[
            { value: '0', label: 'No limit' },
            { value: '30', label: '30 days' },
            { value: '60', label: '60 days' },
            { value: '90', label: '90 days' },
            { value: '180', label: '180 days' },
            { value: '365', label: '1 year' }
          ]}
          value={String(g.keyMaxAgeDays)}
        />
      )}
      {row(
        'Enforce compliance',
        'Block agent changes that break a control, such as expired keys.',
        <Switch aria-label="Enforce compliance" checked={g.complianceEnforce} disabled={saving} onChange={() => void save({ complianceEnforce: !g.complianceEnforce }, 'Saved')} />
      )}
      {row(
        'Scheduled compliance report',
        'Emailed to admins and sent to your webhooks.',
        <Select
          aria-label="Scheduled compliance report"
          className="w-40"
          disabled={saving}
          onValueChange={(value) => void save({ complianceReportSchedule: value as HybridGovernance['complianceReportSchedule'] }, 'Saved')}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
          value={g.complianceReportSchedule}
        />
      )}
      {row(
        'Allowed data regions',
        'Vendors that process data elsewhere fail the data residency control. Comma separated, e.g. EU, United States.',
        <Input
          aria-label="Allowed data regions"
          className="w-56"
          disabled={saving}
          onBlur={() => {
            const next = regions.split(',').map((r) => r.trim()).filter(Boolean);
            if (next.join(',') !== g.allowedDataRegions.join(',')) void save({ allowedDataRegions: next }, 'Allowed regions saved');
          }}
          onChange={(e) => setRegions(e.target.value)}
          placeholder="Any region"
          value={regions}
        />
      )}
    </Card>
  );
}

/** One-click fixes for failing controls, where there is one. */
function remediation(controlId: string): { label: string; to?: string; patch?: Partial<HybridGovernance>; masking?: boolean } | null {
  switch (controlId) {
    case 'shadow_ai':
      return { label: 'Review unregistered agents', to: '/agents/inventory' };
    case 'key_expiration':
    case 'unused_scopes':
    case 'least_privilege':
    case 'credential_hygiene':
    case 'access_reviews':
    case 'inventory':
    case 'risk_assessment':
      return { label: 'Open agents', to: '/agents/inventory' };
    case 'vendors_approved':
    case 'vendors_assessed':
    case 'vendors_evidence':
    case 'data_residency':
      return { label: 'Open vendors', to: '/agents/vendors' };
    case 'approval_coverage':
    case 'human_oversight':
      return { label: 'Switch to Enforce + auto low-risk', patch: { mode: 'auto_low_risk' } };
    case 'dlp_threats':
      return { label: 'Turn on DLP enforcement and threat detection', patch: { dlpMode: 'enforce', threatDetection: true } };
    case 'data_protection':
      return { label: 'Turn on AI data masking', masking: true };
    case 'monitoring':
    case 'record_keeping':
    case 'audit_completeness':
      return { label: 'Open activity', to: '/activity' };
    default:
      return null;
  }
}

/** Live score, trend, failing controls with one-click fixes, on-demand checks and the evidence pack. */
export function ComplianceMonitorCard({
  report,
  workspaceId,
  onRefresh
}: {
  report: ComplianceReport;
  workspaceId: string | null;
  onRefresh: () => Promise<void>;
}): JSX.Element {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const trend = report.trend ?? [];
  const failing = report.controls.filter((c) => c.status !== 'met');

  const run = async (key: string, fn: () => Promise<unknown>, message?: string) => {
    setBusy(key);
    try {
      await fn();
      if (message) showToast({ variant: 'success', message });
      await onRefresh();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const points = trend.length > 1 ? trend : [{ date: today, score: report.score }, { date: today, score: report.score }];
  const path = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - (p.score / 100) * 32}`).join(' ');

  return (
    <Card data-testid="compliance-monitor">
      <CardHeader
        actions={
          <Button icon={RefreshCw} loading={busy === 'check'} onClick={() => void run('check', () => agentsApi.complianceCheck(), 'Compliance checked')} size="sm">
            Run check now
          </Button>
        }
        description="Checked daily and after key events (policy changes, incidents, settings). Controls that start failing raise a drift alert."
        icon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
        title="Compliance monitoring"
      />
      <div className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <div className="text-xs text-slate-500">Compliance score</div>
          <div className="font-mono text-3xl font-semibold text-slate-900" data-testid="compliance-score">
            {report.score}
          </div>
          <svg aria-label="Score trend" className="mt-1 h-10 w-full" preserveAspectRatio="none" role="img" viewBox="0 0 100 36">
            <polyline fill="none" points={path} stroke="var(--color-brand-600)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="text-[11px] text-slate-500">{trend.length ? `${trend.length} day(s) of history` : 'History starts today'}</div>
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 text-[13px] font-medium text-slate-900">
            {failing.length ? `${failing.length} control(s) need attention` : 'All controls met'}
          </div>
          <ul className="m-0 grid list-none gap-1.5 p-0" data-testid="failing-controls">
            {failing.slice(0, 6).map((control) => {
              const fix = remediation(control.id);
              return (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-[13px]" key={control.id}>
                  <span className="min-w-0 flex-1 basis-56">
                    <span className={cn('mr-1.5 font-medium', control.status === 'gap' ? 'text-red-700' : 'text-amber-700')}>{control.status === 'gap' ? 'Gap' : 'Partly met'}</span>
                    {control.title}
                  </span>
                  {fix?.to ? (
                    <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" to={fix.to}>
                      {fix.label}
                    </Link>
                  ) : fix?.patch || fix?.masking ? (
                    <Button
                      loading={busy === control.id}
                      onClick={() =>
                        void run(
                          control.id,
                          () => agentsApi.updateSettings(fix.masking ? { aiDataMasking: true } : { governance: fix.patch }, workspaceId).then(() => agentsApi.complianceCheck()),
                          'Fixed and re-checked'
                        )
                      }
                      size="sm"
                      variant="secondary"
                    >
                      {fix.label}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4">
        <Field className="w-44" label="Evidence from">
          <DateInput max={to} onValueChange={setFrom} value={from} />
        </Field>
        <Field className="w-44" label="to">
          <DateInput max={today} onValueChange={setTo} value={to} />
        </Field>
        <Button
          icon={Download}
          loading={busy === 'pack'}
          onClick={() => void run('pack', () => agentsApi.downloadEvidencePack(from, `${to}T23:59:59`), 'Evidence pack downloaded')}
          variant="primary"
        >
          Download evidence pack
        </Button>
        <span className="text-xs text-slate-500">
          {report.lastEvidencePack ? `Last generated ${new Date(report.lastEvidencePack.at).toLocaleString()}` : 'ZIP with inventory, policies, approvals, shadow AI, DLP, threats, incidents and activity.'}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
        <Link className="inline-flex items-center gap-1 hover:text-slate-800" to="/activity">
          <Activity size={12} /> All decisions in the Activity timeline
        </Link>
        <Link className="inline-flex items-center gap-1 hover:text-slate-800" to="/agents/incidents">
          <Siren size={12} /> Incidents
        </Link>
      </div>
    </Card>
  );
}
