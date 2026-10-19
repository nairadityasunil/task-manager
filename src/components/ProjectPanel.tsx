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
      size: 48,
      meta: { className: 'hidden sm:table-cell' },
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            className="w-4 h-4 cursor-pointer accent-slate-900"
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
            className="w-4 h-4 cursor-pointer accent-slate-900"
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
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
            <FolderKanban className="text-slate-500" size={15} />
          </div>
          <div className="grid gap-0.5 min-w-0">
            <span className="text-slate-900 font-semibold text-sm">{info.getValue()}</span>
            {info.row.original.description && (
              <span className="text-slate-500 text-xs truncate max-w-[320px]">
                {info.row.original.description}
              </span>
            )}
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
                <span className="text-slate-700 truncate max-w-[160px]">{creator.name || creator.email}</span>
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
      meta: { className: 'hidden sm:table-cell' },
      cell: info => (
        <span className="text-slate-600 whitespace-nowrap" title={formatDateTime(info.getValue())}>
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const project = row.original;
        const rowActionCls = 'flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors';
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              className={`${rowActionCls} hover:bg-olive-100  hover:text-olive-600  disabled:opacity-40`}
              disabled={project.currentUserRole !== 'ADMIN'}
              onClick={() => onOpenEpicManager(project)}
              title="Open epics"
              type="button"
            >
              <Layers3 size={16} />
            </button>
            <button
              className={`${rowActionCls} hover:bg-olive-100  hover:text-olive-900  disabled:opacity-40`}
              disabled={project.currentUserRole !== 'ADMIN'}
              onClick={() => onOpenUpdateProject(project)}
              title="Edit project"
              type="button"
            >
              <Pencil size={16} />
            </button>
            <button
              className={`${rowActionCls} hover:bg-red-50  hover:text-red-500  disabled:opacity-50`}
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
    <div className="flex flex-col h-full bg-white ">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200 bg-white">
        <div className="grid gap-0.5 mr-2">
          <h2 className="m-0 font-semibold text-slate-900 text-base">Projects</h2>
          <span className="text-slate-500 text-xs">All projects you can access in this workspace</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md flex items-center ml-auto">
          <Search className="absolute left-3 text-slate-400" size={14} />
          <input
            aria-label="Search projects"
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg shadow-sm transition-colors focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 text-slate-900 placeholder:text-slate-400"
            onChange={handleSearchChange}
            placeholder="Search projects…"
            type="text"
            value={searchTerm}
          />
        </div>

        {selectedProjects.length > 0 && (
          <button
            className="inline-flex items-center gap-2 h-9 px-3.5 bg-white border border-red-200 rounded-lg text-red-600 text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
            onClick={handleDeleteSelected}
            type="button"
          >
            <Trash2 size={16} />
            <span>Delete selected ({selectedProjects.length})</span>
          </button>
        )}

        <button
          className="inline-flex items-center gap-2 h-9 px-3.5 bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
          onClick={onOpenCreateProject}
          type="button"
        >
          <Plus size={16} />
          <span>New project</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-6 py-4 bg-slate-50">
        {projects.length === 0 && !loading ? (
          <div className="py-20 border-y border-transparent">
            {/* Custom Empty State preserved for brand consistency */}
            <div className="flex flex-col items-center justify-center max-w-[400px] mx-auto text-center animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <img
                  src="https://res.cloudinary.com/diqzswlyr/image/upload/q_auto/f_auto/v1776863078/no_data_lyzl4t.png"
                  alt="No Data"
                  className="relative w-82 h-82 mx-auto object-contain opacity-90"
                />
              </div>

              <h3 className="text-xl font-bold text-olive-950  mb-2 tracking-tight">
                {searchTerm ? "No matching projects" : "No projects yet"}
              </h3>

              <p className="text-olive-500  text-sm mb-8 leading-relaxed px-4">
                {searchTerm
                  ? "No projects match your search. Try a different term."
                  : "Create your first project to start planning epics and tasks with your team."}
              </p>

              <button
                onClick={searchTerm ? () => onSearch('') : onOpenCreateProject}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-olive-900  text-white rounded-lg text-sm font-bold shadow-lg shadow-olive-950/20 hover:bg-olive-800  transform transition-all active:scale-95 duration-200"
                type="button"
              >
                {searchTerm ? (
                  <>
                    <Search size={16} strokeWidth={2.5} />
                    <span>Clear search filter</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Create first project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <DataTable
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            tableClassName="border-collapse"
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
        )}
      </div>
    </div>
  );
}

export default ProjectPanel;