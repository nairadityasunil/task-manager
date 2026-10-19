import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Pencil, Plus, Save, Trash2, UsersRound, XCircle } from 'lucide-react';

import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { RuleBuilder, UrlTargeting } from '@/features/engagement/components/TargetingRuleEditor';
import { EditorDialog } from '@/features/engagement/components/ExperienceEditor';
import { Badge, Button, Field, inputClass } from '@/components/ui';
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
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">Audience Segments</h3>
          <p className="m-0 mt-0.5 text-[13px] text-slate-500">Save reusable targeting rules, then apply them when building guides, surveys and checklists.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')} variant="primary">
          Create Segment
        </Button>
      </div>

      {loading && (
        <div aria-busy="true" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {[0, 1].map((row) => (
            <div className="grid gap-2 border-b border-slate-100 px-4 py-4 last:border-0 sm:px-5" key={row}>
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
          <p className="sr-only">Loading segments…</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button className="font-medium underline underline-offset-2" onClick={() => void load()} type="button">Retry</button>
        </div>
      )}

      {!loading && !loadError && segments.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <UsersRound size={20} />
          </span>
          <p className="m-0 mt-4 text-[15px] font-semibold text-slate-900">No segments yet</p>
          <p className="m-0 mt-1 max-w-md text-sm text-slate-500">Create a segment like &quot;Admins on the Pro plan&quot; to reuse it across experiences.</p>
        </div>
      )}

      {!loading && !loadError && segments.length > 0 && (
        <ul className="m-0 list-none divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-sm">
          {segments.map((segment) => (
            <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5" key={segment.id}>
              <div className="min-w-0 flex-1 basis-60">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{segment.name}</span>
                  <Badge className="shrink-0">
                    {countConditions(segment.rules)} rule{countConditions(segment.rules) === 1 ? '' : 's'}
                  </Badge>
                </div>
                {segment.description && <p className="m-0 mt-1 truncate text-[13px] text-slate-500">{segment.description}</p>}
                <p className="m-0 mt-1 truncate text-xs text-slate-500">{summarizeRules(segment.rules)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button icon={FlaskConical} onClick={() => setTesting(segment)} size="sm">Test</Button>
                <Button icon={Pencil} onClick={() => setEditing(segment)} size="sm">Edit</Button>
                <Button icon={Trash2} onClick={() => void handleDelete(segment)} size="sm" variant="danger">Delete</Button>
              </div>
            </li>
          ))}
        </ul>
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
    <EditorDialog
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={saving} icon={Save} onClick={() => void handleSave()} variant="primary">
            {saving ? 'Saving…' : segment ? 'Save Changes' : 'Create Segment'}
          </Button>
        </>
      }
      maxWidth="max-w-3xl"
      onClose={onClose}
      title={segment ? 'Edit Segment' : 'Create Segment'}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Pro plan admins"
              value={name}
            />
          </Field>
          <Field label="Description">
            <input
              className={inputClass}
              maxLength={300}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              value={description}
            />
          </Field>
        </div>
        <UrlTargeting rules={rules} onChange={setRules} />
        <RuleBuilder rules={rules} onChange={setRules} />
        {error && <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </EditorDialog>
  );
}

function SegmentTestModal({ segment, onClose }: { segment: TargetingSegment; onClose: () => void }): JSX.Element {
  const [context, setContext] = useState<SampleVisitorContext>({ url: '', role: '', plan: '', referrer: '' });
  const [result, setResult] = useState<RuleEvaluationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof SampleVisitorContext, label: string, placeholder: string) => (
    <Field label={label}>
      <input
        className={inputClass}
        onChange={(event) => setContext((current) => ({ ...current, [key]: event.target.value }))}
        placeholder={placeholder}
        value={context[key] ?? ''}
      />
    </Field>
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
    <EditorDialog
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button disabled={running} icon={FlaskConical} onClick={() => void runTest()} variant="primary">
            {running ? 'Testing…' : 'Run Test'}
          </Button>
        </>
      }
      maxWidth="max-w-xl"
      onClose={onClose}
      title={<>Test &quot;{segment.name}&quot;</>}
    >
        <div className="grid gap-4">
          <p className="m-0 text-[13px] text-slate-500">Describe a sample visitor to check whether they match this segment. Event and session based rules use the visitor&apos;s recorded history, so they may not match a made-up visitor.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('url', 'Page URL', 'https://app.example.com/dashboard')}
            {field('referrer', 'Referrer', 'https://google.com')}
            {field('role', 'Role', 'ADMIN')}
            {field('plan', 'Plan', 'pro')}
          </div>
          {error && <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {result && (
            <div className={`rounded-lg border px-4 py-3 ${result.eligible ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className={`flex items-center gap-2 text-sm font-medium ${result.eligible ? 'text-emerald-800' : 'text-amber-800'}`}>
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
    </EditorDialog>
  );
}

export default SegmentsPanel;
