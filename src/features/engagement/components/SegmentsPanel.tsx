import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Pencil, Plus, Save, Trash2, UsersRound, X, XCircle } from 'lucide-react';

import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { RuleBuilder, UrlTargeting } from '@/features/engagement/components/TargetingRuleEditor';
import { conditionLabels, defaultRules } from '@/features/engagement/hooks/useEngagement';
import type { TargetingRuleGroup } from '@/lib/guides/types';
import {
  createSegment,
  deleteSegment,
  evaluateRules,
  listSegments,
  updateSegment,
  type RuleEvaluationResult,
  type SampleVisitorContext,
  type TargetingSegment
} from '@/lib/targeting/api';

const errorMessage = (error: unknown, fallback: string): string =>
  typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string'
    ? (error as { message: string }).message
    : fallback;

const countConditions = (group: TargetingRuleGroup): number =>
  (group.conditions?.length ?? 0) + (group.groups ?? []).reduce((total, nested) => total + countConditions(nested), 0);

const summarizeRules = (rules: TargetingRuleGroup): string => {
  const conditions = rules.conditions ?? [];
  if (conditions.length === 0) return 'Everyone';
  const joiner = rules.operator === 'OR' ? ' or ' : ' and ';
  return conditions
    .slice(0, 3)
    .map((condition) => {
      const value = condition.value ?? condition.eventName;
      const label = conditionLabels[condition.type] ?? condition.type;
      return value === undefined || value === '' ? label : `${label} ${String(value)}`;
    })
    .join(joiner) + (conditions.length > 3 ? ` +${conditions.length - 3} more` : '');
};

function SegmentsPanel(): JSX.Element {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [segments, setSegments] = useState<TargetingSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TargetingSegment | 'new' | null>(null);
  const [testing, setTesting] = useState<TargetingSegment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSegments(await listSegments());
    } catch (error) {
      setLoadError(errorMessage(error, 'Failed to load segments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (segment: TargetingSegment) => {
    const isConfirmed = await confirm({
      title: 'Delete Segment',
      message: `Delete "${segment.name}"? Experiences that already copied its rules keep them.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await deleteSegment(segment.id);
      setSegments((current) => current.filter((entry) => entry.id !== segment.id));
      showToast({ variant: 'success', message: 'Segment deleted.' });
    } catch {
      // The API client already shows the error toast.
    }
  };

  const handleSaved = (saved: TargetingSegment) => {
    setSegments((current) => {
      const exists = current.some((entry) => entry.id === saved.id);
      return exists ? current.map((entry) => (entry.id === saved.id ? saved : entry)) : [saved, ...current];
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-bold text-slate-900">Audience Segments</h3>
          <p className="m-0 mt-1 text-sm text-slate-500">Save reusable targeting rules, then apply them when building guides, surveys and checklists.</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
          onClick={() => setEditing('new')}
          type="button"
        >
          <Plus size={16} />
          Create Segment
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading segments…</p>}

      {!loading && loadError && (
        <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button className="font-bold underline" onClick={() => void load()} type="button">Retry</button>
        </div>
      )}

      {!loading && !loadError && segments.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <UsersRound className="mx-auto text-slate-400" size={28} />
          <p className="m-0 mt-3 text-sm font-semibold text-slate-700">No segments yet</p>
          <p className="m-0 mt-1 text-sm text-slate-500">Create a segment like &quot;Admins on the Pro plan&quot; to reuse it across experiences.</p>
        </div>
      )}

      {!loading && !loadError && segments.length > 0 && (
        <div className="grid gap-3">
          {segments.map((segment) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-xs" key={segment.id}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">{segment.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {countConditions(segment.rules)} rule{countConditions(segment.rules) === 1 ? '' : 's'}
                  </span>
                </div>
                {segment.description && <p className="m-0 mt-1 truncate text-sm text-slate-500">{segment.description}</p>}
                <p className="m-0 mt-1 truncate text-xs text-slate-400">{summarizeRules(segment.rules)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => setTesting(segment)} type="button">
                  <FlaskConical size={11} /> Test
                </button>
                <button className="flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => setEditing(segment)} type="button">
                  <Pencil size={11} /> Edit
                </button>
                <button className="flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50" onClick={() => void handleDelete(segment)} type="button">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <SegmentEditorModal
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            handleSaved(saved);
            showToast({ variant: 'success', message: editing === 'new' ? 'Segment created.' : 'Segment updated.' });
          }}
          segment={editing === 'new' ? null : editing}
        />
      )}
      {testing && <SegmentTestModal onClose={() => setTesting(null)} segment={testing} />}
    </div>
  );
}

function SegmentEditorModal({
  segment,
  onClose,
  onSaved
}: {
  segment: TargetingSegment | null;
  onClose: () => void;
  onSaved: (segment: TargetingSegment) => void;
}): JSX.Element {
  const [name, setName] = useState(segment?.name ?? '');
  const [description, setDescription] = useState(segment?.description ?? '');
  const [rules, setRules] = useState<TargetingRuleGroup>(segment?.rules ?? defaultRules());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Segment name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim(), rules };
      const saved = segment ? await updateSegment(segment.id, payload) : await createSegment(payload);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save segment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 flex w-full max-w-3xl flex-col rounded border border-olive-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-olive-100 px-6 py-4">
          <h3 className="text-base font-bold text-olive-950">{segment ? 'Edit Segment' : 'Create Segment'}</h3>
          <button aria-label="Close" className="rounded-full p-1 text-olive-400 hover:bg-olive-100" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500">
              Name
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Pro plan admins"
                value={name}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500">
              Description
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none"
                maxLength={300}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional"
                value={description}
              />
            </label>
          </div>
          <UrlTargeting rules={rules} onChange={setRules} />
          <RuleBuilder rules={rules} onChange={setRules} />
          {error && <p className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-olive-100 px-6 py-4">
          <button className="rounded border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 hover:bg-olive-50" onClick={onClose} type="button">Cancel</button>
          <button
            className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={saving}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={14} />
            {saving ? 'Saving…' : segment ? 'Save Changes' : 'Create Segment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SegmentTestModal({ segment, onClose }: { segment: TargetingSegment; onClose: () => void }): JSX.Element {
  const [context, setContext] = useState<SampleVisitorContext>({ url: '', role: '', plan: '', referrer: '' });
  const [result, setResult] = useState<RuleEvaluationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof SampleVisitorContext, label: string, placeholder: string) => (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-slate-500">
      {label}
      <input
        className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900 focus:border-slate-500 focus:outline-none"
        onChange={(event) => setContext((current) => ({ ...current, [key]: event.target.value }))}
        placeholder={placeholder}
        value={context[key] ?? ''}
      />
    </label>
  );

  const runTest = async () => {
    setRunning(true);
    setError(null);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(context).filter(([, value]) => typeof value === 'string' && value.trim() !== '').map(([key, value]) => [key, (value as string).trim()])
      ) as SampleVisitorContext;
      setResult(await evaluateRules(segment.rules, trimmed));
    } catch (err) {
      setError(errorMessage(err, 'Failed to evaluate rules.'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 flex w-full max-w-xl flex-col rounded border border-olive-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-olive-100 px-6 py-4">
          <h3 className="text-base font-bold text-olive-950">Test &quot;{segment.name}&quot;</h3>
          <button aria-label="Close" className="rounded-full p-1 text-olive-400 hover:bg-olive-100" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-6">
          <p className="m-0 text-sm text-slate-500">Describe a sample visitor to check whether they match this segment. Event and session based rules use the visitor&apos;s recorded history, so they may not match a made-up visitor.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('url', 'Page URL', 'https://app.example.com/dashboard')}
            {field('referrer', 'Referrer', 'https://google.com')}
            {field('role', 'Role', 'ADMIN')}
            {field('plan', 'Plan', 'pro')}
          </div>
          {error && <p className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {result && (
            <div className={`rounded-md border px-4 py-3 ${result.eligible ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className={`flex items-center gap-2 text-sm font-bold ${result.eligible ? 'text-emerald-800' : 'text-amber-800'}`}>
                {result.eligible ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {result.eligible ? 'This visitor matches the segment' : 'This visitor does not match the segment'}
              </div>
              {result.reasons.length > 0 && (
                <ul className="m-0 mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-700">
                  {result.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-olive-100 px-6 py-4">
          <button className="rounded border border-olive-200 px-4 py-2 text-sm font-semibold text-olive-700 hover:bg-olive-50" onClick={onClose} type="button">Close</button>
          <button
            className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={running}
            onClick={() => void runTest()}
            type="button"
          >
            <FlaskConical size={14} />
            {running ? 'Testing…' : 'Run Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SegmentsPanel;
