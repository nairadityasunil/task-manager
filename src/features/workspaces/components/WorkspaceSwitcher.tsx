import React, { useRef, useState, useEffect } from 'react';
import { Building2, Check, ChevronDown, Plus, Settings, Loader2 } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

interface WorkspaceSwitcherProps {
  onOpenSettings?: () => void;
}

export function WorkspaceSwitcher({ onOpenSettings }: WorkspaceSwitcherProps): JSX.Element {
  const { workspaces, activeWorkspace, switchWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <div className="relative" ref={dropRef}>
        <button
          aria-expanded={isOpen}
          aria-label={activeWorkspace ? `Workspace: ${activeWorkspace.name}` : 'Select Workspace'}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={`flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 ${isOpen ? 'bg-slate-50' : ''}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-[11px] font-semibold text-white">
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : activeWorkspace ? (
              activeWorkspace.name.trim().charAt(0).toUpperCase() || 'W'
            ) : (
              <Building2 className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="hidden max-w-[160px] truncate text-slate-800 sm:inline">
            {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="fixed left-3 right-3 top-[58px] z-50 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
            <div className="select-none px-2.5 pb-1 pt-1.5 text-xs font-medium text-slate-500">Workspaces</div>

            <div className="scrollbar-thin max-h-56 space-y-0.5 overflow-y-auto">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspace?.id;
                const initial = ws.name.trim().charAt(0).toUpperCase() || 'W';
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      switchWorkspace(ws);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                          isActive ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-slate-900">{ws.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {ws.memberCount} member{ws.memberCount !== 1 ? 's' : ''} · {ws.role}
                        </div>
                      </div>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                  </button>
                );
              })}

              {workspaces.length === 0 && !isLoading && (
                <div className="px-3 py-4 text-center text-[13px] text-slate-500">No workspaces available</div>
              )}
            </div>

            <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreate(true);
                }}
                className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Plus className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Create New Workspace</span>
              </button>

              {activeWorkspace && onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>Workspace Settings</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateWorkspaceDialog onClose={() => setShowCreate(false)} />}
    </>
  );
}

export default WorkspaceSwitcher;
