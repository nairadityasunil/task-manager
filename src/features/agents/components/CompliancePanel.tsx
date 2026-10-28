import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, CircleDashed, Download, EyeOff, FileCheck2, KeyRound } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, CardHeader, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { agentsApi, type ComplianceReport, type GovernanceSettings } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const STATUS = {
  met: { icon: CheckCircle2, label: 'Met', tone: 'success' as const, color: 'text-emerald-600' },
  partial: { icon: CircleDashed, label: 'Partly met', tone: 'warning' as const, color: 'text-amber-600' },
  gap: { icon: CircleAlert, label: 'Gap', tone: 'danger' as const, color: 'text-red-600' }
};

function SettingSwitch({
  checked,
  label,
  disabled,
  onToggle
}: {
  checked: boolean;
  label: string;
  disabled: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-emerald-500' : 'bg-slate-300')}
      disabled={disabled}
      onClick={onToggle}
      role="switch"
      type="button"
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

export function CompliancePanel({ workspaceId, canAdmin }: { workspaceId: string | null; canAdmin: boolean }): JSX.Element {
  const { showToast } = useToast();
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [nextReport, nextSettings] = await Promise.all([agentsApi.compliance(workspaceId), agentsApi.settings(workspaceId)]);
      setReport(nextReport);
      setSettings(nextSettings);
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  useEffect(() => {
    if (canAdmin) void load();
  }, [workspaceId, canAdmin]);

  if (!canAdmin) {
    return <EmptyState description="Workspace owners and admins can see the governance report." icon={FileCheck2} title="Admins only" />;
  }
  if (!report || !settings) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;

  const toggle = async (key: 'aiDataMasking' | 'requireAgentKeys', on: string, off: string) => {
    setSaving(true);
    try {
      setSettings(await agentsApi.updateSettings({ [key]: !settings[key] }, workspaceId));
      showToast({ variant: 'success', message: settings[key] ? off : on });
      setReport(await agentsApi.compliance(workspaceId));
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-governance-report-${report.generatedAt.slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const scoreTone = report.score >= 80 ? 'text-emerald-600' : report.score >= 50 ? 'text-amber-600' : 'text-red-600';
  const strokeTone = report.score >= 80 ? 'stroke-emerald-500' : report.score >= 50 ? 'stroke-amber-500' : 'stroke-red-500';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center gap-2 p-5 text-center">
          <div className="relative h-28 w-28">
            <svg aria-hidden className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle className="stroke-slate-100" cx="18" cy="18" fill="none" r="15.9" strokeWidth="3" />
              <circle
                className={cn('transition-all', strokeTone)}
                cx="18"
                cy="18"
                fill="none"
                r="15.9"
                strokeDasharray={`${report.score} 100`}
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <span className={cn('absolute inset-0 flex items-center justify-center text-3xl font-semibold tabular-nums', scoreTone)} data-testid="compliance-score">
              {report.score}
            </span>
          </div>
          <div className="text-[13px] font-medium text-slate-900">Governance score</div>
          <p className="m-0 text-xs text-slate-500">
            {report.controls.filter((c) => c.status === 'met').length} of {report.controls.length} controls met
          </p>
          <Button icon={Download} onClick={downloadReport} size="sm">
            Download report
          </Button>
        </Card>

        <Card>
          <CardHeader
            description="Personal data and secrets are replaced with placeholders before prompts reach OpenAI, Anthropic, Gemini or other providers."
            icon={<EyeOff className="h-4 w-4 text-slate-400" />}
            title="AI data masking"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-[13px] text-slate-600">
              Emails, phone numbers, card numbers and API keys become <code className="font-mono">[email]</code>, <code className="font-mono">[phone]</code>,{' '}
              <code className="font-mono">[card]</code> and <code className="font-mono">[secret]</code>.
            </div>
            <SettingSwitch
              checked={settings.aiDataMasking}
              disabled={saving}
              label="AI data masking"
              onToggle={() => void toggle('aiDataMasking', 'AI data masking turned on', 'AI data masking turned off')}
            />
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Agent activity is kept for {settings.activityRetentionDays} days. Inputs are masked before they are stored.
          </div>
        </Card>

        <Card className="lg:col-start-2">
          <CardHeader
            description="Scripts and automated browsers that use a person's login are always found and shown as unregistered agents."
            icon={<KeyRound className="h-4 w-4 text-slate-400" />}
            title="Require agent keys"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-[13px] text-slate-600">
              When on, they are refused until they use their own agent key. When off, they keep working and are governed like any agent.
            </div>
            <SettingSwitch
              checked={settings.requireAgentKeys}
              disabled={saving}
              label="Require agent keys"
              onToggle={() =>
                void toggle('requireAgentKeys', 'Scripts now need agent keys', 'Scripts may use personal logins again (still monitored)')
              }
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          description={report.disclaimer}
          icon={<FileCheck2 className="h-4 w-4 text-slate-400" />}
          title="Controls"
        />
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {report.controls.map((control) => {
            const status = STATUS[control.status];
            const Icon = status.icon;
            return (
              <li className="flex gap-3 px-4 py-3" data-testid="compliance-control" key={control.id}>
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', status.color)} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-900">{control.title}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">{control.framework}</div>
                  <p className="m-0 text-[13px] text-slate-600">{control.evidence}</p>
                  {control.recommendation ? <p className="m-0 text-[13px] font-medium text-slate-800">→ {control.recommendation}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
