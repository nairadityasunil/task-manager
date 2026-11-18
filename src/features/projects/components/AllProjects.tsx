import { FolderOpen, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Input, Select, tagColor } from '@/components/ui';
import { getAllProjects } from '@/services/projects';
import { useWorkspace } from '@/features/workspaces';
import type { Project } from '@/types/project';

const day = (v?: string): string => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Every project, not just the first page: search, sort, and open one. */
export function AllProjects({
  onOpen,
  onNewProject,
  reloadKey,
}: {
  onOpen: (projectId: string) => void;
  onNewProject: () => void;
  /** Changes when projects are added or removed elsewhere, so the list reloads. */
  reloadKey?: unknown;
}): JSX.Element {
  const { activeWorkspaceId } = useWorkspace();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'created'>('recent');

  useEffect(() => {
    let cancelled = false;
    getAllProjects(undefined, activeWorkspaceId || undefined)
      .then((list) => !cancelled && setProjects(list))
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setProjects([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, activeWorkspaceId]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (projects ?? []).filter((p) => !needle || p.name.toLowerCase().includes(needle) || (p.description ?? '').toLowerCase().includes(needle));
    return [...list].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : new Date((sort === 'created' ? b.createdAt : b.updatedAt) ?? 0).getTime() - new Date((sort === 'created' ? a.createdAt : a.updatedAt) ?? 0).getTime(),
    );
  }, [projects, q, sort]);

  return (
    <div className="grid w-full gap-4 px-3 py-4 sm:px-5 lg:px-6" data-testid="all-projects">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-lg font-semibold tracking-tight text-slate-900">All projects</h1>
          <p className="m-0 text-[13px] text-slate-500">{projects ? `${projects.length} project${projects.length === 1 ? '' : 's'} you are part of` : 'Loading'}</p>
        </div>
        <Button icon={Plus} onClick={onNewProject} variant="primary">
          New project
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input aria-label="Search projects" className="pl-8" onChange={(e) => setQ(e.target.value)} placeholder="Search projects" value={q} />
        </div>
        <div className="w-48">
          <Select
            aria-label="Sort projects"
            onValueChange={(v) => setSort(v as typeof sort)}
            options={[
              { value: 'recent', label: 'Recently updated' },
              { value: 'created', label: 'Newest first' },
              { value: 'name', label: 'Name A to Z' },
            ]}
            value={sort}
          />
        </div>
      </div>
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">
          The projects could not be loaded. Check your connection and refresh.
        </p>
      ) : null}
      {!projects ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : !shown.length ? (
        <EmptyState
          action={q ? undefined : <Button onClick={onNewProject} variant="primary">Create a project</Button>}
          description={q ? 'No project matches that search.' : 'Projects group the work of a team.'}
          icon={FolderOpen}
          title={q ? 'No match' : 'No projects yet'}
        />
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" data-testid="all-projects-list">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                className="flex h-full w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/20"
                data-testid="all-projects-row"
                onClick={() => onOpen(p.id)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: tagColor(p.id) }} />
                  <span className="truncate text-sm font-semibold text-slate-900">{p.name}</span>
                </span>
                {p.description ? <span className="line-clamp-2 text-[13px] text-slate-600">{p.description}</span> : null}
                <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-500">
                  <Badge tone={p.currentUserRole === 'ADMIN' ? 'violet' : 'neutral'}>{p.currentUserRole === 'ADMIN' ? 'Admin' : 'Member'}</Badge>
                  <span>Created {day(p.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
