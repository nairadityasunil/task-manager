import React, { useState, useMemo } from 'react';
import type { Project } from '@/types/project';
import {
  FolderKanban,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
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
import { Button, Card, inputClass } from '@/components/ui';

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
}: ProjectPanelProps): JSX.Element {
  const confirm = useConfirm();
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
            className="h-4 w-4 cursor-pointer rounded accent-slate-900"
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
            className="h-4 w-4 cursor-pointer rounded accent-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <FolderKanban size={16} />
          </div>
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

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <PageHeader
        title="Projects"
        description="All projects you can access in this workspace"
        actions={
          <>
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
            {selectedProjects.length > 0 && (
              <Button icon={Trash2} onClick={handleDeleteSelected} variant="danger">
                Delete selected ({selectedProjects.length})
              </Button>
            )}
            <Button icon={Plus} onClick={onOpenCreateProject} variant="primary">
              New project
            </Button>
          </>
        }
      />

      <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {projects.length === 0 && !loading ? (
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
        ) : (
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
        )}
      </div>
    </div>
  );
}

export default ProjectPanel;
