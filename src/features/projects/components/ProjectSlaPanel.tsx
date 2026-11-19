import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, inputClass } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { getProjectSlaConfigs, resetProjectSlaConfig, updateProjectSlaConfig } from '@/services/sla';
import type { ProjectSlaConfig, TaskPriority } from '@/types/task';
import { toDisplayErrorMessage } from '@/utils/apiError';

const LABEL: Record<TaskPriority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
const DOT: Record<TaskPriority, string> = { LOW: 'bg-slate-400', MEDIUM: 'bg-amber-400', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500' };

interface Draft {
  response: string;
  resolution: string;
}

const toDraft = (c: ProjectSlaConfig): Draft => ({ response: String(c.responseTimeHours), resolution: String(c.resolutionTimeHours) });

/** Response and resolution times for the tasks of one project. Admins change them; everyone on the project can see them. */
export function ProjectSlaPanel({ projectId, canManage }: { projectId: string; canManage: boolean }): JSX.Element {
  const { showToast } = useToast();
  const [configs, setConfigs] = useState<ProjectSlaConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<TaskPriority | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getProjectSlaConfigs(projectId);
      setConfigs(list);
      setDrafts(Object.fromEntries(list.map((c) => [c.priority, toDraft(c)])));
    } catch (err) {
      setError(toDisplayErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (c: ProjectSlaConfig): Promise<void> => {
    const d = drafts[c.priority];
    const response = Number(d.response);
    const resolution = Number(d.resolution);
    if (!Number.isFinite(response) || !Number.isFinite(resolution) || response <= 0 || resolution <= 0) {
      showToast({ variant: 'error', message: 'Enter the hours as positive numbers.' });
      return;
    }
    if (response >= resolution) {
      showToast({ variant: 'error', message: 'The response time must be shorter than the resolution time.' });
      return;
    }
    setBusy(c.priority);
    try {
      await updateProjectSlaConfig(projectId, { priority: c.priority, responseTimeHours: response, resolutionTimeHours: resolution });
      showToast({ variant: 'success', message: `${LABEL[c.priority]} priority tasks in this project now use ${response}h / ${resolution}h.` });
      await load();
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const reset = async (c: ProjectSlaConfig): Promise<void> => {
    setBusy(c.priority);
    try {
      await resetProjectSlaConfig(projectId, c.priority);
      showToast({ variant: 'success', message: `${LABEL[c.priority]} priority is back to your defaults.` });
      await load();
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-[13px] text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading SLA times…
      </div>
    );
  }
  if (error) return <div className="p-5 text-[13px] text-red-600">{error}</div>;

  return (
    <div className="grid gap-4 p-5" data-testid="project-sla">
      <p className="m-0 text-[13px] text-slate-600">
        How long tasks in this project have to get a first response and to be resolved, by priority. Priorities you do not change use your own SLA targets from Settings.
        {canManage ? ' Changing a time re-dates the open tasks of that priority.' : ' Only project admins can change these.'}
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">Priority</th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">Response (hours)</th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">Resolution (hours)</th>
              {canManage && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {configs.map((c) => {
              const d = drafts[c.priority] ?? toDraft(c);
              const changed = d.response !== String(c.responseTimeHours) || d.resolution !== String(c.resolutionTimeHours);
              const setDraft = (patch: Partial<Draft>): void => setDrafts((prev) => ({ ...prev, [c.priority]: { ...d, ...patch } }));
              return (
                <tr key={c.priority} data-testid={`project-sla-${c.priority}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[c.priority]}`} />
                      <span className="font-medium text-slate-900">{LABEL[c.priority]}</span>
                      <Badge tone={c.custom ? 'brand' : 'neutral'}>{c.custom ? 'Custom' : 'Default'}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <input aria-label={`${LABEL[c.priority]} response hours`} className={`${inputClass} w-24`} disabled={!canManage || busy !== null} min="0.01" onChange={(e) => setDraft({ response: e.target.value })} step="any" type="number" value={d.response} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input aria-label={`${LABEL[c.priority]} resolution hours`} className={`${inputClass} w-24`} disabled={!canManage || busy !== null} min="0.01" onChange={(e) => setDraft({ resolution: e.target.value })} step="any" type="number" value={d.resolution} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button disabled={!changed || busy !== null} icon={Save} loading={busy === c.priority} onClick={() => void save(c)} size="sm" variant="primary">
                          Save
                        </Button>
                        {c.custom && (
                          <Button disabled={busy !== null} icon={RotateCcw} onClick={() => void reset(c)} size="sm" variant="secondary">
                            Reset
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
