import { useMemo, useState } from 'react';
import {
  AppWindow,
  Archive,
  ArchiveRestore,
  BarChart3,
  ClipboardList,
  Crosshair,
  Inbox,
  Lightbulb,
  ListChecks,
  Map as MapIcon,
  Megaphone,
  MessageSquareText,
  Pause,
  Pencil,
  Play,
  Plus,
  Rocket,
  Search,
  Target,
  Trash2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Guide, GuideStatus, GuideType } from '@/lib/guides/types';

export type ExperienceKind = 'guides' | 'surveys' | 'checklists';
type StatusFilter = 'ALL' | GuideStatus;

const KIND_COPY: Record<ExperienceKind, { singular: string; plural: string; empty: string }> = {
  guides: {
    singular: 'Guide',
    plural: 'Guides',
    empty: 'Tours, modals, tips, hotspots and banners that walk users through your product.'
  },
  surveys: {
    singular: 'Survey',
    plural: 'Surveys',
    empty: 'Collect NPS, CSAT and open feedback from the right users at the right moment.'
  },
  checklists: {
    singular: 'Checklist',
    plural: 'Checklists',
    empty: 'Onboarding task lists that complete automatically as users take each step.'
  }
};

const TYPE_META: Record<GuideType, { icon: LucideIcon; label: string; tint: string }> = {
  TOUR: { icon: MapIcon, label: 'Tour', tint: 'bg-sky-50 text-sky-600 ring-sky-100' },
  MODAL: { icon: AppWindow, label: 'Modal', tint: 'bg-violet-50 text-violet-600 ring-violet-100' },
  SMART_TIP: { icon: Lightbulb, label: 'Smart tip', tint: 'bg-amber-50 text-amber-600 ring-amber-100' },
  HOTSPOT: { icon: Crosshair, label: 'Hotspot', tint: 'bg-rose-50 text-rose-600 ring-rose-100' },
  BANNER: { icon: Megaphone, label: 'Banner', tint: 'bg-orange-50 text-orange-600 ring-orange-100' },
  SURVEY: { icon: MessageSquareText, label: 'Survey', tint: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  CHECKLIST: { icon: ListChecks, label: 'Checklist', tint: 'bg-teal-50 text-teal-600 ring-teal-100' }
};

const STATUS_META: Record<GuideStatus, { label: string; pill: string; dot: string }> = {
  LIVE: { label: 'Live', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  DRAFT: { label: 'Draft', pill: 'bg-slate-50 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  PAUSED: { label: 'Paused', pill: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  ARCHIVED: { label: 'Archived', pill: 'bg-zinc-100 text-zinc-500 ring-zinc-200', dot: 'bg-zinc-400' }
};

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'text-red-600',
  HIGH: 'text-orange-600',
  MEDIUM: 'text-slate-600',
  LOW: 'text-slate-400'
};

const FILTERS: StatusFilter[] = ['ALL', 'LIVE', 'DRAFT', 'PAUSED', 'ARCHIVED'];

const countRules = (experience: Guide): number => {
  const count = (group: Guide['targetingRules']): number =>
    group ? (group.conditions?.length ?? 0) + (group.groups ?? []).reduce((sum, nested) => sum + count(nested), 0) : 0;
  return count(experience.targetingRules);
};

const formatRelative = (value?: string): string => {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '—';
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};

interface ExperienceLibraryProps {
  kind: ExperienceKind;
  experiences: Guide[];
  loading: boolean;
  onCreate: () => void;
  onStatusChange: (experience: Guide, status: GuideStatus) => Promise<void>;
  onEdit: (experience: Guide) => void;
  onDelete: (experience: Guide) => Promise<void>;
  onViewAnalytics?: (experience: Guide) => void;
  onViewResponses?: (experience: Guide) => void;
}

function ExperienceLibrary({
  kind,
  experiences,
  loading,
  onCreate,
  onStatusChange,
  onEdit,
  onDelete,
  onViewAnalytics,
  onViewResponses
}: ExperienceLibraryProps): JSX.Element {
  const copy = KIND_COPY[kind];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { ALL: 0, LIVE: 0, DRAFT: 0, PAUSED: 0, ARCHIVED: 0 };
    experiences.forEach((experience) => {
      const status = experience.status ?? 'DRAFT';
      result[status] += 1;
      if (status !== 'ARCHIVED') result.ALL += 1;
    });
    return result;
  }, [experiences]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return experiences.filter((experience) => {
      const status = experience.status ?? 'DRAFT';
      const statusMatch = filter === 'ALL' ? status !== 'ARCHIVED' : status === filter;
      const textMatch =
        needle === '' ||
        experience.title.toLowerCase().includes(needle) ||
        (experience.description ?? '').toLowerCase().includes(needle);
      return statusMatch && textMatch;
    });
  }, [experiences, filter, query]);

  const run = async (experience: Guide, action: () => Promise<void>) => {
    setPendingId(experience.id);
    try {
      await action();
    } catch {
      // The API client already shows the error toast.
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            aria-label={`Search ${copy.plural.toLowerCase()}`}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${copy.plural.toLowerCase()}…`}
            value={query}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter by status">
          {FILTERS.map((entry) => (
            <button
              aria-selected={filter === entry}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filter === entry ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              key={entry}
              onClick={() => setFilter(entry)}
              role="tab"
              type="button"
            >
              {entry === 'ALL' ? 'All' : STATUS_META[entry].label}
              <span className={`rounded px-1 text-[10px] ${filter === entry ? 'bg-slate-100 text-slate-600' : 'text-slate-400'}`}>{counts[entry]}</span>
            </button>
          ))}
        </div>
        <button
          className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          onClick={onCreate}
          type="button"
        >
          <Plus size={15} />
          New {copy.singular.toLowerCase()}
        </button>
      </div>

      {loading && experiences.length === 0 ? (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <li className="flex items-center gap-4 px-5 py-4" key={row}>
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            {experiences.length === 0 ? <ClipboardList size={22} /> : <Inbox size={22} />}
          </div>
          <p className="m-0 mt-4 text-sm font-semibold text-slate-900">
            {experiences.length === 0 ? `No ${copy.plural.toLowerCase()} yet` : 'Nothing matches these filters'}
          </p>
          <p className="m-0 mt-1 max-w-sm text-sm text-slate-500">
            {experiences.length === 0 ? copy.empty : 'Try a different search or status.'}
          </p>
          {experiences.length === 0 && (
            <button
              className="mt-5 flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={onCreate}
              type="button"
            >
              <Plus size={15} /> Create your first {copy.singular.toLowerCase()}
            </button>
          )}
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {visible.map((experience) => {
            const status = experience.status ?? 'DRAFT';
            const statusMeta = STATUS_META[status];
            const typeMeta = TYPE_META[experience.type] ?? TYPE_META.MODAL;
            const TypeIcon = typeMeta.icon;
            const ruleCount = countRules(experience);
            const stepCount = experience.steps?.length ?? 0;
            const stepLabel = kind === 'surveys' ? 'question' : kind === 'checklists' ? 'item' : 'step';
            const busy = pendingId === experience.id;

            return (
              <li className={`group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-4 transition-colors hover:bg-slate-50/70 ${busy ? 'opacity-60' : ''}`} key={experience.id}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${typeMeta.tint}`}>
                  <TypeIcon size={18} />
                </div>

                <button className="min-w-0 flex-1 basis-56 text-left" onClick={() => onEdit(experience)} type="button">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-slate-700">{experience.title}</span>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusMeta.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot} ${status === 'LIVE' ? 'animate-pulse' : ''}`} />
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {kind === 'guides' && <span>{typeMeta.label}</span>}
                    <span>
                      {stepCount} {stepLabel}
                      {stepCount === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Target size={11} />
                      {ruleCount === 0 ? 'Everyone' : `${ruleCount} rule${ruleCount === 1 ? '' : 's'}`}
                    </span>
                    {kind !== 'checklists' && experience.priority && (
                      <span className={`font-medium ${PRIORITY_STYLE[experience.priority] ?? 'text-slate-500'}`}>
                        {experience.priority.charAt(0) + experience.priority.slice(1).toLowerCase()} priority
                      </span>
                    )}
                    <span className="text-slate-400">Updated {formatRelative(experience.updatedAt)}</span>
                  </div>
                  {experience.description && <p className="m-0 mt-1 truncate text-xs text-slate-400">{experience.description}</p>}
                </button>

                <div className="ml-auto flex shrink-0 items-center gap-1">
                  {status === 'DRAFT' && (
                    <PrimaryAction disabled={busy} icon={Rocket} label="Publish" onClick={() => void run(experience, () => onStatusChange(experience, 'LIVE'))} tone="emerald" />
                  )}
                  {status === 'LIVE' && (
                    <PrimaryAction disabled={busy} icon={Pause} label="Pause" onClick={() => void run(experience, () => onStatusChange(experience, 'PAUSED'))} tone="amber" />
                  )}
                  {status === 'PAUSED' && (
                    <PrimaryAction disabled={busy} icon={Play} label="Resume" onClick={() => void run(experience, () => onStatusChange(experience, 'LIVE'))} tone="emerald" />
                  )}
                  {status === 'ARCHIVED' && (
                    <PrimaryAction disabled={busy} icon={ArchiveRestore} label="Restore" onClick={() => void run(experience, () => onStatusChange(experience, 'DRAFT'))} tone="slate" />
                  )}
                  <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
                  {onViewAnalytics && <IconAction icon={BarChart3} label="Analytics" onClick={() => onViewAnalytics(experience)} />}
                  {onViewResponses && <IconAction icon={MessageSquareText} label="Responses" onClick={() => onViewResponses(experience)} />}
                  <IconAction icon={Pencil} label="Edit" onClick={() => onEdit(experience)} />
                  {status !== 'ARCHIVED' && status !== 'LIVE' && (
                    <IconAction disabled={busy} icon={Archive} label="Archive" onClick={() => void run(experience, () => onStatusChange(experience, 'ARCHIVED'))} />
                  )}
                  <IconAction danger disabled={busy} icon={Trash2} label="Delete" onClick={() => void run(experience, () => onDelete(experience))} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PrimaryAction({
  icon: Icon,
  label,
  onClick,
  tone,
  disabled
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: 'emerald' | 'amber' | 'slate';
  disabled?: boolean;
}): JSX.Element {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    slate: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  };
  return (
    <button
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700'
      }`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={15} />
    </button>
  );
}

export default ExperienceLibrary;
