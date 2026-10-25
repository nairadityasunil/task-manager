import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Pause, Play, Rocket, RotateCcw, ShieldCheck, SkipForward, X } from 'lucide-react';

import Modal from '@/components/Modal';
import { Badge, Button, cn, type BadgeTone } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentsApi, type PromptFinding } from '@/services/agents';
import { promptService, type PromptCanaryDeployment, type PromptItem, type PromptVersion } from '@/services/prompts';
import { toDisplayErrorMessage } from '@/utils/apiError';

const ENV_TONE: Record<string, BadgeTone> = {
  production: 'success',
  staging: 'info',
  canary: 'warning',
  development: 'neutral'
};

const SEVERITY_TONE: Record<PromptFinding['severity'], BadgeTone> = { high: 'danger', medium: 'warning', low: 'neutral' };

const PHASES = [5, 25, 50, 100];

const pct = (part: number, whole: number): string => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—');
const avg = (total: number, count: number, unit: string): string => (count > 0 ? `${Math.round(total / count)} ${unit}` : '—');

function CanaryCard({
  canary,
  busy,
  onAction
}: {
  canary: PromptCanaryDeployment;
  busy: boolean;
  onAction: (action: 'advance' | 'pause' | 'resume' | 'rollback' | 'complete' | 'cancel') => void;
}): JSX.Element {
  const m = canary.metrics;
  const live = canary.status === 'active' || canary.status === 'paused';
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4" data-testid="canary-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-900">
            Canary: v{canary.candidateVersion} replacing v{canary.legacyVersion}
          </span>
          <Badge dot tone={canary.status === 'active' ? 'warning' : canary.status === 'completed' ? 'success' : 'neutral'}>
            {canary.status.replace('_', ' ')}
          </Badge>
        </div>
        <span className="text-xs tabular-nums text-slate-500">
          {canary.trafficWeight.canary}% new · {canary.trafficWeight.legacy}% current
        </span>
      </div>

      <div aria-label={`Rollout ${canary.rolloutProgress}%`} className="mt-3 grid grid-cols-4 gap-1" role="progressbar" aria-valuenow={canary.rolloutProgress} aria-valuemin={0} aria-valuemax={100}>
        {PHASES.map((phase, index) => (
          <div key={phase}>
            <div className={cn('h-1.5 rounded-full', canary.currentPhase > index ? 'bg-amber-500' : 'bg-slate-200')} />
            <div className={cn('mt-1 text-[11px] tabular-nums', canary.currentPhase === index + 1 ? 'font-semibold text-slate-900' : 'text-slate-500')}>{phase}%</div>
          </div>
        ))}
      </div>

      <dl className="m-0 mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ['Requests (new / current)', `${m.canaryRequests} / ${m.legacyRequests}`],
          ['Error rate (new / current)', `${pct(m.canaryErrors, m.canaryRequests)} / ${pct(m.legacyErrors, m.legacyRequests)}`],
          ['Latency (new / current)', `${avg(m.canaryLatencyMsTotal, m.canaryRequests, 'ms')} / ${avg(m.legacyLatencyMsTotal, m.legacyRequests, 'ms')}`],
          ['Error limit', `${(canary.errorThreshold * 100).toFixed(0)}% after ${canary.minRequests} requests`]
        ].map(([label, value]) => (
          <div className="rounded-lg border border-slate-200 bg-white p-2" key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="m-0 mt-0.5 font-medium tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {canary.rollbackReason ? <p className="m-0 mt-2 text-xs text-red-700">Rolled back: {canary.rollbackReason}</p> : null}

      {live ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {canary.currentPhase < 4 ? (
            <Button disabled={busy || canary.status !== 'active'} icon={SkipForward} onClick={() => onAction('advance')} size="sm" variant="primary">
              Advance to {PHASES.at(canary.currentPhase)}%
            </Button>
          ) : (
            <Button disabled={busy} icon={CheckCircle2} onClick={() => onAction('complete')} size="sm" variant="primary">
              Complete rollout
            </Button>
          )}
          {canary.status === 'active' ? (
            <Button disabled={busy} icon={Pause} onClick={() => onAction('pause')} size="sm">
              Pause
            </Button>
          ) : (
            <Button disabled={busy} icon={Play} onClick={() => onAction('resume')} size="sm">
              Resume
            </Button>
          )}
          <Button disabled={busy} icon={RotateCcw} onClick={() => onAction('rollback')} size="sm" variant="danger">
            Roll back
          </Button>
          <Button disabled={busy} icon={X} onClick={() => onAction('cancel')} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface PromptDeployModalProps {
  workspaceId: string;
  prompt: PromptItem;
  onClose: () => void;
  onChanged?: () => void;
}

/** Versions, environments, prompt checks and canary rollouts for one prompt. */
export function PromptDeployModal({ workspaceId, prompt, onClose, onChanged }: PromptDeployModalProps): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [versions, setVersions] = useState<PromptVersion[] | null>(null);
  const [canary, setCanary] = useState<PromptCanaryDeployment | null>(null);
  const [productionVersion, setProductionVersion] = useState<number | undefined>(prompt.productionVersion);
  const [checks, setChecks] = useState<Record<number, PromptFinding[] | 'loading'>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextVersions, nextCanary, details] = await Promise.all([
        promptService.listVersions(workspaceId, prompt._id),
        promptService.getCanaryDeployment(workspaceId, prompt._id).catch(() => null),
        promptService.getPrompt(workspaceId, prompt._id).catch(() => null)
      ]);
      setVersions([...nextVersions].sort((a, b) => b.version - a.version));
      setCanary(nextCanary);
      if (details) setProductionVersion(details.productionVersion);
    } catch (error) {
      setVersions([]);
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  }, [workspaceId, prompt._id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runChecks = async (version: PromptVersion): Promise<PromptFinding[]> => {
    setChecks((current) => ({ ...current, [version.version]: 'loading' }));
    try {
      const result = await agentsApi.promptChecks({ body: version.body, messages: version.messages });
      setChecks((current) => ({ ...current, [version.version]: result.findings }));
      return result.findings;
    } catch (error) {
      setChecks((current) => {
        const next = { ...current };
        delete next[version.version];
        return next;
      });
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      return [];
    }
  };

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      showToast({ variant: 'success', message });
      onChanged?.();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const startCanary = async (version: PromptVersion) => {
    const findings = await runChecks(version);
    const high = findings.filter((f) => f.severity === 'high');
    let acknowledgeChecks = false;
    if (high.length) {
      const ok = await confirm({
        title: 'Prompt checks found problems',
        message: `${high.map((f) => f.message).join(' ')} Start the rollout anyway?`,
        confirmText: 'Start anyway',
        type: 'danger'
      });
      if (!ok) return;
      acknowledgeChecks = true;
    }
    await act(
      () => promptService.startCanary(workspaceId, prompt._id, version.version, { acknowledgeChecks }),
      `Canary started: v${version.version} gets 5% of traffic`
    );
  };

  const canaryAction = async (action: 'advance' | 'pause' | 'resume' | 'rollback' | 'complete' | 'cancel') => {
    if (action === 'rollback' || action === 'cancel') {
      const ok = await confirm({
        title: action === 'rollback' ? 'Roll back the canary?' : 'Cancel the canary?',
        message: 'All traffic goes back to the current production version.',
        confirmText: action === 'rollback' ? 'Roll back' : 'Cancel rollout',
        type: 'danger'
      });
      if (!ok) return;
    }
    const calls = {
      advance: () => promptService.advanceCanary(workspaceId, prompt._id),
      pause: () => promptService.pauseCanary(workspaceId, prompt._id),
      resume: () => promptService.resumeCanary(workspaceId, prompt._id),
      rollback: () => promptService.rollbackCanary(workspaceId, prompt._id, 'Rolled back from the portal'),
      complete: () => promptService.completeCanary(workspaceId, prompt._id),
      cancel: () => promptService.cancelCanary(workspaceId, prompt._id, 'Cancelled from the portal')
    };
    const messages = {
      advance: 'Canary advanced',
      pause: 'Canary paused',
      resume: 'Canary resumed',
      rollback: 'Canary rolled back',
      complete: 'Rollout complete: the new version is in production',
      cancel: 'Canary cancelled'
    };
    await act(calls[action], messages[action]);
  };

  const liveCanary = canary && (canary.status === 'active' || canary.status === 'paused');

  return (
    <Modal
      description="Move versions through staging, publish them, or roll one out gradually with a canary."
      maxWidth="max-w-[760px]"
      onClose={onClose}
      title={`Deploy “${prompt.name}”`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
          <Rocket className="h-4 w-4 text-slate-400" />
          Production version:{' '}
          <strong className="font-semibold text-slate-900" data-testid="production-version">
            {productionVersion ? `v${productionVersion}` : 'none yet'}
          </strong>
        </div>

        {canary ? <CanaryCard busy={busy} canary={canary} onAction={(a) => void canaryAction(a)} /> : null}

        {versions == null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" key={i} />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="m-0 text-[13px] text-slate-500">No versions yet. Save the prompt in the playground first.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {versions.map((version) => {
              const env = version.version === productionVersion ? 'production' : (version.environment ?? 'development');
              const found = checks[version.version];
              const isProduction = version.version === productionVersion;
              return (
                <li className="rounded-xl border border-slate-200 p-3" data-testid="deploy-version" key={version._id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900">v{version.version}</span>
                        <Badge dot tone={ENV_TONE[env] ?? 'neutral'}>
                          {env}
                        </Badge>
                      </div>
                      <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
                        {version.changeNote || 'No change note'} · {version.changedBy?.name ?? 'Unknown'} · {new Date(version.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button disabled={busy} icon={ShieldCheck} onClick={() => void runChecks(version)} size="sm" variant="ghost">
                        Check
                      </Button>
                      {!isProduction && env !== 'staging' ? (
                        <Button
                          disabled={busy}
                          onClick={() => void act(() => promptService.moveToStaging(workspaceId, prompt._id, version.version), `v${version.version} moved to staging`)}
                          size="sm"
                        >
                          To staging
                        </Button>
                      ) : null}
                      {!isProduction && !liveCanary && productionVersion ? (
                        <Button disabled={busy} icon={FlaskConical} onClick={() => void startCanary(version)} size="sm">
                          Start canary
                        </Button>
                      ) : null}
                      {!isProduction ? (
                        <Button
                          disabled={busy || Boolean(liveCanary)}
                          icon={Rocket}
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Publish v${version.version} to production?`,
                              message: 'All traffic switches to this version at once. Use a canary to roll out gradually.',
                              confirmText: 'Publish now'
                            });
                            if (ok) await act(() => promptService.deployDirectToProduction(workspaceId, prompt._id, version.version), `v${version.version} is now in production`);
                          }}
                          size="sm"
                          variant="primary"
                        >
                          Publish
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {found === 'loading' ? (
                    <p className="m-0 mt-2 text-xs text-slate-500">Checking…</p>
                  ) : found ? (
                    found.length === 0 ? (
                      <p className="m-0 mt-2 flex items-center gap-1.5 text-xs text-emerald-700" data-testid="checks-clean">
                        <CheckCircle2 className="h-3.5 w-3.5" /> No problems found.
                      </p>
                    ) : (
                      <ul className="m-0 mt-2 list-none space-y-1 p-0" data-testid="checks-findings">
                        {found.map((finding) => (
                          <li className="flex items-start gap-2 text-xs text-slate-700" key={finding.code}>
                            <AlertTriangle className={cn('mt-px h-3.5 w-3.5 shrink-0', finding.severity === 'high' ? 'text-red-600' : 'text-amber-600')} />
                            <span className="min-w-0">
                              <Badge className="mr-1.5" tone={SEVERITY_TONE[finding.severity]}>
                                {finding.severity}
                              </Badge>
                              {finding.message} <span className="text-slate-400">({finding.framework})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {!productionVersion && versions && versions.length > 0 ? (
          <p className="m-0 text-xs text-slate-500">Publish a first version before starting a canary: a canary compares a new version with the one in production.</p>
        ) : null}
      </div>
    </Modal>
  );
}
