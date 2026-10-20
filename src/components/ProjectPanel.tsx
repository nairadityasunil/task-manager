import React, { useState, useMemo } from 'react';
import type { Project } from '@/types/project';
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  Layers3,
  List,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import type { Epic } from '@/types/epic';
import type { Task } from '@/types/task';
import Skeleton from './Skeleton';
import UserAvatar from './UserAvatar';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import DataTable from './DataTable';
import { useConfirm } from '@/context/ConfirmationContext';
import EmptyState from './EmptyState';
import PageHeader from './PageHeader';
import { Badge, Button, Card, IconTile, cn, inputClass, type TileTone } from '@/components/ui';

const PROJECT_TONES: TileTone[] = ['sky', 'violet', 'amber', 'emerald', 'rose', 'indigo', 'teal', 'orange'];

/** A stable tint per project so each one is easy to recognise. */
function projectTone(id: string): TileTone {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_TONES[hash % PROJECT_TONES.length];
}

const VIEW_KEY = 'pristine.projects.view';
function readView(): 'grid' | 'table' {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

const columnHelper = createColumnHelper<Project>();

interface ProjectPanelProps {
  actionProjectId: string | null;
  loading: boolean;
  onOpenCreateProject: () => void;
  onOpenEpicManager: (project: Project) => void;
  onOpenProject: (projectId: string | null) => void;
  onOpenUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteProjects: (projectIds: string[]) => Promise<void>;
  projects: Project[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  /** Rendered inside the dashboard overview: no page header, card grid by default. */
  embedded?: boolean;
  /** Loaded epics and today's tasks, used for per-project stats in the grid. */
  epics?: Epic[];
  tasks?: Task[];
}

function ProjectPanel({
  actionProjectId,
  loading,
  onOpenCreateProject,
  onOpenEpicManager,
  onOpenProject,
  onOpenUpdateProject,
  onDeleteProject,
  onDeleteProjects,
  projects,
  currentPage,
  totalPages,
  onPageChange,
  onSearch,
  searchTerm,
  embedded = false,
  epics = [],
  tasks = [],
}: ProjectPanelProps): JSX.Element {
  const confirm = useConfirm();
  const [view, setViewState] = useState<'grid' | 'table'>(() => (embedded ? readView() : 'table'));
  const setView = (next: 'grid' | 'table') => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      size: 44,
      meta: { className: 'hidden sm:table-cell !pr-0' },
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Select all projects"
            className="h-4 w-4 cursor-pointer rounded accent-emerald-600"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) {
                el.indeterminate = table.getIsSomePageRowsSelected();
              }
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${row.original.name}`}
            className="h-4 w-4 cursor-pointer rounded accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            checked={row.getIsSelected()}
            disabled={row.original.currentUserRole !== 'ADMIN'}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('name', {
      header: 'Project',
      cell: info => (
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={FolderKanban} size="md" tone={projectTone(info.row.original.id)} />
          <div className="grid min-w-0 gap-0.5">
            <span className="truncate text-sm font-medium text-slate-900">{info.getValue()}</span>
            {info.row.original.description && (
              <span className="max-w-[200px] truncate text-[13px] text-slate-500 sm:max-w-[360px]">
                {info.row.original.description}
              </span>
            )}
            <span className="text-xs text-slate-400 sm:hidden">Created {formatDate(info.row.original.createdAt)}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('creator', {
      header: 'Creator',
      meta: { className: 'hidden md:table-cell' },
      cell: info => {
        const creator = info.getValue();
        return (
          <div className="flex items-center gap-2">
            {creator ? (
              <>
                <UserAvatar size="sm" name={creator.name} email={creator.email} />
                <span className="max-w-[160px] truncate text-slate-700">{creator.name || creator.email}</span>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('createdAt', {
      id: 'created',
      header: 'Created',
      size: 140,
      meta: { className: 'hidden sm:table-cell' },
      cell: info => (
        <span className="whitespace-nowrap text-slate-500" title={formatDateTime(info.getValue())}>
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      size: 128,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const project = row.original;
        const rowActionCls = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors disabled:pointer-events-none';
        return (
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              className={`${rowActionCls} hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40`}
              disabled={project.currentUserRole !== 'ADMIN'}
              onClick={() => onOpenEpicManager(project)}
              title="Open epics"
              type="button"
            >
              <Layers3 size={16} />
            </button>
            <button
              className={`${rowActionCls} hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40`}
              disabled={project.currentUserRole !== 'ADMIN'}
              onClick={() => onOpenUpdateProject(project)}
              title="Edit project"
              type="button"
            >
              <Pencil size={16} />
            </button>
            <button
              className={`${rowActionCls} hover:bg-red-50 hover:text-red-600 disabled:opacity-40`}
              disabled={actionProjectId === project.id || project.currentUserRole !== 'ADMIN'}
              onClick={async () => {
                const isConfirmed = await confirm({
                  title: 'Delete Project',
                  message: `Are you sure you want to delete "${project.name}"? This action is irreversible.`,
                  confirmText: 'Delete Project',
                  type: 'danger'
                });
                if (isConfirmed) {
                  await onDeleteProject(project.id);
                }
              }}
              title="Delete project"
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
      enableSorting: false,
    }),
  ], [onOpenEpicManager, onOpenUpdateProject, onDeleteProject, actionProjectId]);

  const table = useReactTable({
    data: projects,
    columns,
    state: {
      rowSelection,
      sorting,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    // Paging is done by the server; letting the table reset its page index
    // schedules a state update before the component mounts.
    autoResetPageIndex: false,
  });

  const selectedProjects = useMemo(() => {
    return table.getSelectedRowModel().flatRows.map(row => row.original);
  }, [rowSelection, projects]);

  const handleDeleteSelected = async () => {
    if (selectedProjects.length === 0) return;

    const isConfirmed = await confirm({
      title: 'Delete Multiple Projects',
      message: `Are you sure you want to delete ${selectedProjects.length} selected projects? This action is irreversible.`,
      confirmText: 'Delete Projects',
      type: 'danger'
    });

    if (!isConfirmed) return;

    await onDeleteProjects(selectedProjects.map(p => p.id));
    setRowSelection({});
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium'
    }).format(new Date(dateString));
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return undefined;
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateString));
  };

  const epicCount = (projectId: string) => epics.filter((epic) => epic.projectId === projectId).length;
  const taskStats = (projectId: string) => {
    const own = tasks.filter((task) => task.projectId === projectId);
    const done = own.filter((task) => task.status === 'DONE').length;
    return { total: own.length, done };
  };

  const searchBox = (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
      <input
        aria-label="Search projects"
        className={`${inputClass} pl-9`}
        onChange={handleSearchChange}
        placeholder="Search projects…"
        type="search"
        value={searchTerm}
      />
    </div>
  );

  const deleteSelectedButton =
    selectedProjects.length > 0 ? (
      <Button icon={Trash2} onClick={handleDeleteSelected} variant="danger">
        Delete selected ({selectedProjects.length})
      </Button>
    ) : null;

  const viewToggle = (
    <div aria-label="Project layout" className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5" role="group">
      {([['grid', LayoutGrid, 'Grid view'], ['table', List, 'Table view']] as const).map(([value, Icon, title]) => (
        <button
          aria-pressed={view === value}
          className={cn(
            'flex h-7 w-8 items-center justify-center rounded-md transition-colors duration-150',
            view === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          )}
          key={value}
          onClick={() => setView(value)}
          title={title}
          type="button"
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );

  const rowActionCls =
    'flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40';

  const grid = (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading && projects.length === 0
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton className="h-[148px] rounded-xl" key={i} />)
          : table.getRowModel().rows.map((row) => {
              const project = row.original;
              const isAdmin = project.currentUserRole === 'ADMIN';
              const { total, done } = taskStats(project.id);
              const pct = total ? Math.round((done / total) * 100) : 0;
              const epicsN = epicCount(project.id);
              return (
                <Card
                  className={cn(
                    'group relative flex min-w-0 flex-col p-3.5',
                    row.getIsSelected() && 'border-emerald-300 ring-2 ring-emerald-500/20'
                  )}
                  interactive
                  key={project.id}
                >
                  <div className="flex items-start gap-3">
                    <IconTile icon={FolderKanban} size="lg" tone={projectTone(project.id)} />
                    <div className="min-w-0 flex-1">
                      <button
                        className="block max-w-full truncate text-left text-sm font-semibold tracking-tight text-slate-900 after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:text-emerald-700 focus-visible:outline-none"
                        onClick={() => onOpenProject(project.id)}
                        type="button"
                      >
                        {project.name}
                      </button>
                      <p className="m-0 mt-0.5 line-clamp-2 min-h-[2.25rem] text-[13px] leading-[1.125rem] text-slate-500">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <input
                      aria-label={`Select ${project.name}`}
                      checked={row.getIsSelected()}
                      className="relative z-10 mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!isAdmin}
                      onChange={row.getToggleSelectedHandler()}
                      type="checkbox"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers3 size={13} className="text-slate-400" />
                      <span className="tabular-nums">{epicsN}</span> {epicsN === 1 ? 'epic' : 'epics'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="tabular-nums">{total}</span> {total === 1 ? 'task' : 'tasks'} today
                    </span>
                    <Badge className="ml-auto" tone={isAdmin ? 'brand' : 'neutral'}>
                      {isAdmin ? 'Admin' : 'Member'}
                    </Badge>
                  </div>
                  <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                      {project.creator ? (
                        <UserAvatar email={project.creator.email} name={project.creator.name} showTooltip={false} size="sm" />
                      ) : null}
                      <span className="truncate" title={formatDateTime(project.createdAt)}>
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                    <div className="relative z-10 flex items-center gap-0.5">
                      <button
                        className={`${rowActionCls} hover:bg-slate-100 hover:text-slate-700`}
                        disabled={!isAdmin}
                        onClick={() => onOpenEpicManager(project)}
                        title="Open epics"
                        type="button"
                      >
                        <Layers3 size={15} />
                      </button>
                      <button
                        className={`${rowActionCls} hover:bg-slate-100 hover:text-slate-700`}
                        disabled={!isAdmin}
                        onClick={() => onOpenUpdateProject(project)}
                        title="Edit project"
                        type="button"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className={`${rowActionCls} hover:bg-red-50 hover:text-red-600`}
                        disabled={actionProjectId === project.id || !isAdmin}
                        onClick={async () => {
                          const isConfirmed = await confirm({
                            title: 'Delete Project',
                            message: `Are you sure you want to delete "${project.name}"? This action is irreversible.`,
                            confirmText: 'Delete Project',
                            type: 'danger'
                          });
                          if (isConfirmed) {
                            await onDeleteProject(project.id);
                          }
                        }}
                        title="Delete project"
                        type="button"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-slate-500">
            Page <span className="font-medium text-slate-900 tabular-nums">{currentPage}</span> of{' '}
            <span className="font-medium text-slate-900 tabular-nums">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} size="icon-sm" title="Previous Page">
              <ChevronLeft size={16} />
            </Button>
            <Button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} size="icon-sm" title="Next Page">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const tableView = (
    <Card className="overflow-hidden">
      <DataTable
        tableClassName="border-collapse table-fixed sm:table-auto"
        table={table}
        loading={loading}
        onRowClick={(project) => onOpenProject(project.id)}
        skeletonRows={5}
        pagination={{
          page: currentPage,
          totalPages,
          onPageChange
        }}
      />
    </Card>
  );

  const body =
    projects.length === 0 && !loading ? (
      <EmptyState
        icon={searchTerm ? Search : FolderKanban}
        title={searchTerm ? 'No matching projects' : 'No projects yet'}
        description={
          searchTerm
            ? 'No projects match your search. Try a different term.'
            : 'Create your first project to start planning epics and tasks with your team.'
        }
        action={
          searchTerm ? (
            <Button icon={Search} onClick={() => onSearch('')} variant="secondary">
              Clear search filter
            </Button>
          ) : (
            <Button icon={Plus} onClick={onOpenCreateProject} variant="primary">
              Create first project
            </Button>
          )
        }
      />
    ) : view === 'grid' ? (
      grid
    ) : (
      tableView
    );

  if (embedded) {
    return (
      <section aria-labelledby="projects-heading" className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[15px] font-semibold tracking-tight text-slate-900" id="projects-heading">
              Projects
            </h2>
            {!loading || projects.length > 0 ? <Badge className="tabular-nums">{projects.length}</Badge> : null}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:flex-none">{searchBox}</div>
            {deleteSelectedButton}
            {viewToggle}
          </div>
        </div>
        {body}
      </section>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <PageHeader
        title="Projects"
        description="All projects you can access in this workspace"
        icon={FolderKanban}
        tone="sky"
        actions={
          <>
            {searchBox}
            {deleteSelectedButton}
            <Button icon={Plus} onClick={onOpenCreateProject} variant="primary">
              New project
            </Button>
          </>
        }
      />

      <div className="flex-1 px-3 py-4 sm:px-5 lg:px-6">{body}</div>
    </div>
  );
}

export default ProjectPanel;
