import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CircleDashed, Folder, Plus, Search, Sparkles, type LucideIcon } from 'lucide-react';

import { cn, tagColor } from '@/components/ui';

export interface PaletteItem {
  id: string;
  group: 'Tasks' | 'Epics' | 'Projects' | 'Pages' | 'Actions';
  label: string;
  /** Muted text on the right, e.g. the project name. */
  hint?: string;
  /** Square colour swatch (projects, epics). */
  swatch?: string;
  icon?: LucideIcon;
  /** Shortcut shown on the right. */
  shortcut?: string;
  run: () => void;
}

const GROUP_ORDER: PaletteItem['group'][] = ['Tasks', 'Epics', 'Projects', 'Pages', 'Actions'];
const PER_GROUP = 5;

/** The label with the matched part in bold. */
function Highlight({ text, query }: { text: string; query: string }): JSX.Element {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-slate-900">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </>
  );
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}

/** ⌘K: jump to any task, epic, project or page, or run an action. */
export function CommandPalette({ open, onClose, items }: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Escape closes it even before focus has reached the search box.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = items.filter((item) => !q || `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(q));
    // Without a query, show places and actions; tasks and epics need a search.
    const visible = q ? matching : matching.filter((item) => item.group === 'Pages' || item.group === 'Actions' || item.group === 'Projects');
    return GROUP_ORDER.flatMap((group) => visible.filter((item) => item.group === group).slice(0, q ? PER_GROUP : 8));
  }, [items, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open || typeof document === 'undefined') return null;

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[active]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-start justify-center bg-stone-900/30 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        aria-label="Command palette"
        aria-modal="true"
        className="w-full max-w-[640px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_48px_rgba(28,25,23,0.18),0_2px_6px_rgba(28,25,23,0.08)]"
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <label className="flex h-[52px] items-center gap-2.5 border-b border-slate-100 px-4">
          <Search aria-hidden className="text-slate-500" size={16} />
          <span className="sr-only">Search or run a command</span>
          <input
            aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
            aria-controls="palette-results"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, projects and pages…"
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            value={query}
          />
          <kbd className="rounded border border-slate-200 px-1.5 font-mono text-[11px] text-slate-500">Esc</kbd>
        </label>
        <div className="max-h-[52vh] overflow-y-auto p-1.5" id="palette-results" ref={listRef} role="listbox" aria-label="Results">
          {results.length === 0 ? (
            <p className="m-0 px-3 py-6 text-center text-[13px] text-slate-500">No matches for “{query}”.</p>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const showHeading = index === 0 || results[index - 1].group !== item.group;
              return (
                <Fragment key={item.id}>
                  {showHeading ? <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium text-slate-500">{item.group}</div> : null}
                  <div
                    aria-selected={index === active}
                    className={cn(
                      'flex h-[38px] cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] text-slate-700',
                      index === active && 'bg-brand-50 text-slate-900'
                    )}
                    data-index={index}
                    data-testid="palette-item"
                    id={`palette-${item.id}`}
                    onClick={() => choose(item)}
                    onMouseMove={() => setActive(index)}
                    role="option"
                  >
                    {item.swatch ? (
                      <span aria-hidden className="mx-0.5 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: item.swatch }} />
                    ) : Icon ? (
                      <Icon aria-hidden className="shrink-0 text-slate-500" size={15} />
                    ) : null}
                    <span className="truncate">
                      <Highlight query={query.trim()} text={item.label} />
                    </span>
                    {item.hint ? <span className="ml-auto truncate pl-3 text-slate-500">{item.hint}</span> : null}
                    {item.shortcut ? (
                      <kbd className={cn('rounded border border-slate-200 px-1.5 font-mono text-[11px] text-slate-500', !item.hint && 'ml-auto')}>{item.shortcut}</kbd>
                    ) : null}
                  </div>
                </Fragment>
              );
            })
          )}
        </div>
        <div className="flex gap-4 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            <kbd className="font-mono">↑↓</kbd> to move
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> to open
          </span>
          <span className="ml-auto">
            <kbd className="font-mono">⌘K</kbd> anywhere
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Builds palette items from the workspace data the dashboard already has. */
export function buildPaletteItems(input: {
  projects: Array<{ id: string; name: string }>;
  epics: Array<{ id: string; name: string; projectId: string }>;
  tasks: Array<{ id: string; title: string; projectId?: string | null; epicId?: string | null }>;
  go: (path: string) => void;
  openTask: (task: { id: string; projectId?: string | null; epicId?: string | null }) => void;
  actions: Array<{ id: string; label: string; run: () => void; shortcut?: string }>;
}): PaletteItem[] {
  const projectName = new Map(input.projects.map((p) => [p.id, p.name]));
  const pages: Array<[string, string]> = [
    ['Home', '/dashboard'],
    ['Intelligence', '/intelligence'],
    ['Prompt library', '/prompts'],
    ['Prompt playground', '/playground'],
    ['Agent governance', '/agents'],
    ['Agents and keys', '/agents/inventory'],
    ['Vendors', '/agents/vendors'],
    ['Approvals', '/agents/approvals'],
    ['Policies', '/agents/policies'],
    ['Activity log', '/agents/activity'],
    ['AI costs', '/agents/costs'],
    ['Compliance', '/agents/compliance'],
    ['SDK integrations', '/sdk-integrations'],
    ['SDK docs', '/sdk-docs'],
    ['Settings', '/settings'],
    ['Product guide', '/guide']
  ];
  return [
    ...input.tasks.map((task) => ({
      id: `task-${task.id}`,
      group: 'Tasks' as const,
      label: task.title,
      hint: task.projectId ? projectName.get(task.projectId) : undefined,
      icon: CircleDashed,
      run: () => input.openTask(task)
    })),
    ...input.epics.map((epic) => ({
      id: `epic-${epic.id}`,
      group: 'Epics' as const,
      label: epic.name,
      hint: projectName.get(epic.projectId),
      swatch: tagColor(epic.id),
      run: () => input.go(`/projects/${epic.projectId}/epics/${epic.id}`)
    })),
    ...input.projects.map((project) => ({
      id: `project-${project.id}`,
      group: 'Projects' as const,
      label: project.name,
      swatch: tagColor(project.id),
      icon: Folder,
      run: () => input.go(`/projects/${project.id}`)
    })),
    ...pages.map(([label, path]) => ({ id: `page-${path}`, group: 'Pages' as const, label, icon: ArrowRight, run: () => input.go(path) })),
    ...input.actions.map((action) => ({
      id: `action-${action.id}`,
      group: 'Actions' as const,
      label: action.label,
      icon: action.id === 'plan' ? Sparkles : Plus,
      shortcut: action.shortcut,
      run: action.run
    }))
  ];
}
