import { useEffect, useState } from 'react';
import { Bookmark, Link, Plus, Target, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { conditionLabels, conditionPlaceholders, conditionTypes } from '@/features/engagement/hooks/useEngagement';
import type { TargetingCondition, TargetingConditionType, TargetingRuleGroup } from '@/lib/guides/types';
import { listSegments, type TargetingSegment } from '@/lib/targeting/api';

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-slate-700 " />
      <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-slate-900 ">{title}</h3>
    </div>
  );
}

const cloneRules = (rules: TargetingRuleGroup): TargetingRuleGroup =>
  JSON.parse(JSON.stringify(rules)) as TargetingRuleGroup;

/** Lets an experience start from a saved audience segment's rules. */
export function SegmentPicker({ onApply }: { onApply: (rules: TargetingRuleGroup) => void }): JSX.Element | null {
  const [segments, setSegments] = useState<TargetingSegment[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let cancelled = false;
    listSegments()
      .then((list) => {
        if (!cancelled) setSegments(list);
      })
      .catch(() => {
        // The API client already surfaces the error; the picker just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (segments.length === 0) return null;

  const selected = segments.find((segment) => segment.id === selectedId);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 p-3">
      <Bookmark size={15} className="text-slate-500" />
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Saved segment</span>
      <select
        aria-label="Saved segment"
        className="min-w-[180px] flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        onChange={(event) => setSelectedId(event.target.value)}
        value={selectedId}
      >
        <option value="">Choose a segment…</option>
        {segments.map((segment) => (
          <option key={segment.id} value={segment.id}>{segment.name}</option>
        ))}
      </select>
      <button
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        disabled={!selected}
        onClick={() => selected && onApply({ ...cloneRules(selected.rules), id: crypto.randomUUID() })}
        title="Replaces the current page and audience rules"
        type="button"
      >
        Apply rules
      </button>
    </div>
  );
}

/** Quick-entry component for URL-based page targeting */
export function UrlTargeting({ rules, onChange }: { rules: TargetingRuleGroup; onChange: (rules: TargetingRuleGroup) => void }): JSX.Element {
  const urlConditions = (rules.conditions ?? []).filter((c) => c.type === 'URL_CONTAINS' || c.type === 'URL_EQUALS');

  const addUrl = () => {
    const condition: TargetingCondition = { id: crypto.randomUUID(), type: 'URL_CONTAINS', value: '' };
    onChange({ ...rules, conditions: [...(rules.conditions ?? []), condition] });
  };

  const updateUrl = (id: string, value: string) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).map((c) => (c.id === id ? { ...c, value, eventName: value } : c)) });
  };

  const updateMatchType = (id: string, type: TargetingConditionType) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).map((c) => (c.id === id ? { ...c, type } : c)) });
  };

  const removeUrl = (id: string) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).filter((c) => c.id !== id) });
  };

  return (
    <div className="mt-6 rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon={Link} title="Show on Pages" />
        <button className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={addUrl} type="button">
          <Plus size={13} />
          Add URL
        </button>
      </div>
      {urlConditions.length === 0 && (
        <p className="m-0 text-sm text-slate-400 italic">No page filter — shown on every page. Add a URL to restrict where this appears.</p>
      )}
      <div className="grid gap-2">
        {urlConditions.map((condition) => (
          <div className="flex items-center gap-2" key={condition.id}>
            <select
              className="shrink-0 rounded-md border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700"
              value={condition.type}
              onChange={(e) => updateMatchType(condition.id, e.target.value as TargetingConditionType)}
            >
              <option value="URL_CONTAINS">contains</option>
              <option value="URL_EQUALS">equals</option>
            </select>
            <input
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-300 focus:border-slate-500 focus:outline-none"
              placeholder="e.g. /dashboard or https://app.example.com/settings"
              value={String(condition.value ?? '')}
              onChange={(e) => updateUrl(condition.id, e.target.value)}
            />
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeUrl(condition.id)} type="button">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuleBuilder({ rules, onChange }: { rules: TargetingRuleGroup; onChange: (rules: TargetingRuleGroup) => void }): JSX.Element {
  // Exclude URL conditions — those are managed by UrlTargeting above
  const nonUrlConditions = (rules.conditions ?? []).filter((c) => c.type !== 'URL_CONTAINS' && c.type !== 'URL_EQUALS');
  const noValueTypes: TargetingConditionType[] = ['EXIT_INTENT', 'IDLE_TIMEOUT'];

  const addCondition = () => {
    const condition: TargetingCondition = { id: crypto.randomUUID(), type: 'ROLE_EQUALS', value: 'ADMIN' };
    onChange({ ...rules, conditions: [...(rules.conditions ?? []), condition] });
  };

  const updateCondition = (id: string, patch: Partial<TargetingCondition>) => {
    onChange({
      ...rules,
      conditions: (rules.conditions ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c))
    });
  };

  const removeCondition = (id: string) => {
    onChange({ ...rules, conditions: (rules.conditions ?? []).filter((c) => c.id !== id) });
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle icon={Target} title="Audience Rules" />
        <div className="flex items-center gap-2">
          <select className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold" onChange={(event) => onChange({ ...rules, operator: event.target.value as 'AND' | 'OR' })} value={rules.operator}>
            <option value="AND">Match ALL</option>
            <option value="OR">Match ANY</option>
          </select>
          <button className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={addCondition} type="button">
            <Plus size={13} />
            Add Rule
          </button>
        </div>
      </div>
      <div className="grid gap-2">
        {nonUrlConditions.map((condition) => (
          <div className="flex items-center gap-2" key={condition.id}>
            <select
              className="shrink-0 rounded-md border border-slate-200 px-2 py-2 text-sm"
              value={condition.type}
              onChange={(e) => updateCondition(condition.id, { type: e.target.value as TargetingConditionType })}
            >
              {conditionTypes
                .filter((t) => t !== 'URL_CONTAINS' && t !== 'URL_EQUALS')
                .map((t) => <option key={t} value={t}>{conditionLabels[t]}</option>)}
            </select>
            {!noValueTypes.includes(condition.type) && (
              <input
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-300 focus:border-slate-500 focus:outline-none"
                placeholder={conditionPlaceholders[condition.type] ?? ''}
                value={String(condition.value ?? condition.eventName ?? '')}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value, eventName: e.target.value })}
              />
            )}
            {noValueTypes.includes(condition.type) && (
              <span className="flex-1 rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm italic text-slate-400">Triggered automatically — no value needed</span>
            )}
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeCondition(condition.id)} type="button">
              <X size={15} />
            </button>
          </div>
        ))}
        {nonUrlConditions.length === 0 && <p className="m-0 text-sm italic text-slate-400">No audience rules — visible to all authenticated users.</p>}
      </div>
    </div>
  );
}
