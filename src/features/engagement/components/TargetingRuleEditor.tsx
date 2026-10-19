import { useEffect, useState } from 'react';
import { Bookmark, Link, Plus, Target, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { conditionLabels, conditionPlaceholders, conditionTypes } from '@/features/engagement/hooks/useEngagement';
import type { TargetingCondition, TargetingConditionType, TargetingRuleGroup } from '@/lib/guides/types';
import { listSegments, type TargetingSegment } from '@/lib/targeting/api';
import { Button, cn, inputClass, selectClass } from '@/components/ui';

function SectionTitle({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }): JSX.Element {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-medium text-slate-900">{title}</h3>
        {description && <p className="m-0 mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

const removeBtn =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600';

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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <Bookmark size={15} className="text-slate-400" />
      <span className="text-sm font-medium text-slate-700">Saved segment</span>
      <select
        aria-label="Saved segment"
        className={cn(selectClass, 'w-auto min-w-[180px] flex-1')}
        onChange={(event) => setSelectedId(event.target.value)}
        value={selectedId}
      >
        <option value="">Choose a segment…</option>
        {segments.map((segment) => (
          <option key={segment.id} value={segment.id}>{segment.name}</option>
        ))}
      </select>
      <Button
        disabled={!selected}
        onClick={() => selected && onApply({ ...cloneRules(selected.rules), id: crypto.randomUUID() })}
        title="Replaces the current page and audience rules"
      >
        Apply rules
      </Button>
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <SectionTitle icon={Link} title="Show on Pages" />
        <Button icon={Plus} onClick={addUrl} size="sm">
          Add URL
        </Button>
      </div>
      {urlConditions.length === 0 && (
        <p className="m-0 text-[13px] text-slate-500">No page filter — shown on every page. Add a URL to restrict where this appears.</p>
      )}
      <div className="grid gap-2">
        {urlConditions.map((condition) => (
          <div className="flex items-center gap-2" key={condition.id}>
            <select
              aria-label="URL match"
              className={cn(selectClass, 'shrink-0 basis-[112px]')}
              value={condition.type}
              onChange={(e) => updateMatchType(condition.id, e.target.value as TargetingConditionType)}
            >
              <option value="URL_CONTAINS">contains</option>
              <option value="URL_EQUALS">equals</option>
            </select>
            <input
              className={cn(inputClass, 'min-w-0 flex-1')}
              placeholder="e.g. /dashboard or https://app.example.com/settings"
              value={String(condition.value ?? '')}
              onChange={(e) => updateUrl(condition.id, e.target.value)}
            />
            <button aria-label="Remove URL" className={removeBtn} onClick={() => removeUrl(condition.id)} title="Remove URL" type="button">
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <SectionTitle icon={Target} title="Audience Rules" />
        <div className="flex items-center gap-2">
          <select aria-label="Match" className={cn(selectClass, 'basis-[124px]')} onChange={(event) => onChange({ ...rules, operator: event.target.value as 'AND' | 'OR' })} value={rules.operator}>
            <option value="AND">Match ALL</option>
            <option value="OR">Match ANY</option>
          </select>
          <Button icon={Plus} onClick={addCondition}>
            Add Rule
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        {nonUrlConditions.map((condition) => (
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap" key={condition.id}>
            <select
              aria-label="Rule type"
              className={cn(selectClass, 'w-full sm:w-56 sm:shrink-0')}
              value={condition.type}
              onChange={(e) => updateCondition(condition.id, { type: e.target.value as TargetingConditionType })}
            >
              {conditionTypes
                .filter((t) => t !== 'URL_CONTAINS' && t !== 'URL_EQUALS')
                .map((t) => <option key={t} value={t}>{conditionLabels[t]}</option>)}
            </select>
            {!noValueTypes.includes(condition.type) && (
              <input
                className={cn(inputClass, 'min-w-0 flex-1')}
                placeholder={conditionPlaceholders[condition.type] ?? ''}
                value={String(condition.value ?? condition.eventName ?? '')}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value, eventName: e.target.value })}
              />
            )}
            {noValueTypes.includes(condition.type) && (
              <span className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-dashed border-slate-200 px-3 text-[13px] text-slate-500">Triggered automatically — no value needed</span>
            )}
            <button aria-label="Remove rule" className={removeBtn} onClick={() => removeCondition(condition.id)} title="Remove rule" type="button">
              <X size={15} />
            </button>
          </div>
        ))}
        {nonUrlConditions.length === 0 && <p className="m-0 text-[13px] text-slate-500">No audience rules — visible to all authenticated users.</p>}
      </div>
    </div>
  );
}
