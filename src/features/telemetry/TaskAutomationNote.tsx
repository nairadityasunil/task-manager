import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Workflow } from 'lucide-react';

import { RULE_LABELS, telemetryApi, type TaskAutomation } from '@/services/telemetry';

import { MetricLine } from './AutomationPanel';

/** On a task the system opened: why it exists, where the numbers are, and whether the fix worked. */
export function TaskAutomationNote({
  taskId,
  onOpenSource,
}: {
  taskId: string;
  /** Called when the source link is followed, so a task panel can close and reveal the page it points to. */
  onOpenSource?: () => void;
}): JSX.Element | null {
  const [info, setInfo] = useState<TaskAutomation | null>(null);
  useEffect(() => {
    let cancelled = false;
    setInfo(null);
    telemetryApi
      .forTask(taskId)
      .then((data) => !cancelled && setInfo(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [taskId]);
  if (!info) return null;
  return (
    <section
      className="rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2.5"
      data-testid="task-automation"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-800">
        <Workflow aria-hidden className="h-3.5 w-3.5 text-sky-700" />
        <span className="font-medium">Opened automatically</span>
        <span className="text-slate-600">· {RULE_LABELS[info.rule] ?? info.rule}</span>
        <Link
          className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700"
          onClick={onOpenSource}
          to={info.sourceLink}
        >
          Open the source
        </Link>
      </div>
      {info.metric ? (
        <div className="mt-1.5">
          <MetricLine task={info} />
        </div>
      ) : null}
      <p className="m-0 mt-1 text-xs text-slate-500">
        {info.closedBy === 'system'
          ? 'Pristine closed this task because the cause went away.'
          : info.metric
            ? info.result
              ? 'Measured again after the task was done.'
              : 'Once this task is done, the metric is measured again to show whether the fix worked.'
            : 'It closes by itself when the cause goes away.'}
      </p>
    </section>
  );
}

/** "Governance ready" once a project's governance checklist is done; "Governance setup" while it is open. */
export function GovernanceReadyBadge({
  projectId,
  refreshKey,
}: {
  projectId: string;
  refreshKey?: unknown;
}): JSX.Element | null {
  const [state, setState] = useState<'ready' | 'pending' | null>(null);
  useEffect(() => {
    let cancelled = false;
    telemetryApi
      .projectGovernance([projectId])
      .then((data) => !cancelled && setState(data[projectId] ?? null))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);
  if (!state) return null;
  return (
    <span
      className={
        state === 'ready'
          ? 'inline-flex h-6 select-none items-center gap-1 rounded bg-green-50 px-1.5 text-[11px] font-medium text-green-800'
          : 'inline-flex h-6 select-none items-center gap-1 rounded bg-slate-100 px-1.5 text-[11px] font-medium text-slate-700'
      }
      data-testid="governance-ready"
      title={
        state === 'ready'
          ? 'The governance checklist for this project is done.'
          : 'Finish the governance checklist task to mark this project ready.'
      }
    >
      {state === 'ready' ? 'Governance ready' : 'Governance setup open'}
    </span>
  );
}
