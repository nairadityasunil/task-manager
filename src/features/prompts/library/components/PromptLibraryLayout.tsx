import React from "react";
import {
  Sparkles,
  Plus,
  FolderPlus,
  Folder as FolderIcon,
  ArrowLeft,
  X,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { PromptItem, PromptFolder } from "@/services/prompts";
import { PromptLibraryToolbar } from "./PromptLibraryToolbar";
import { PromptGrid } from "./PromptGrid";
import { PromptFolderGrid } from "./PromptFolderGrid";
import { PromptMoveModal } from "./PromptMoveModal";
import { PromptVersionCompareModal } from "@/components/PromptVersionCompareModal";
import PageHeader from "@/components/PageHeader";
import { Button, buttonClass, inputClass } from "@/components/ui";

interface PromptLibraryLayoutProps {
  workspaceId: string;
  activeView: "prompts" | "folders";
  setActiveView: (view: "prompts" | "folders") => void;
  prompts: PromptItem[];
  folders: PromptFolder[];
  isLoading: boolean;
  isCreatingPrompt: boolean;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (fav: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  isCreatingFolder: boolean;
  setIsCreatingFolder: (creating: boolean) => void;
  activeMenuPromptId: string | null;
  setActiveMenuPromptId: (id: string | null) => void;
  moveModalPrompt: PromptItem | null;
  setMoveModalPrompt: (prompt: PromptItem | null) => void;
  targetFolderId: string | null;
  setTargetFolderId: (id: string | null) => void;
  isMoving: boolean;
  deleteModalPrompt: PromptItem | null;
  setDeleteModalPrompt: (prompt: PromptItem | null) => void;
  isDeleting: boolean;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
  displayedPrompts: PromptItem[];
  folderMap: Map<string, string>;
  folderPromptCounts: Map<string, number>;
  onNewPrompt: (onCreated: (promptId: string, version: number) => void) => void;
  onCreateFolder: () => void;
  onDeleteFolder: (folderId: string, e: React.MouseEvent) => void;
  onToggleFavorite: (promptId: string, e: React.MouseEvent) => void;
  onConfirmMove: () => Promise<void>;
  onConfirmDelete: () => Promise<void>;
  onOpenPlayground: (promptId: string, version: number) => void;
  comparePrompt: PromptItem | null;
  setComparePrompt: (prompt: PromptItem | null) => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;
}

export const PromptLibraryLayout: React.FC<PromptLibraryLayoutProps> = ({
  workspaceId,
  activeView,
  setActiveView,
  prompts,
  folders,
  isLoading,
  isCreatingPrompt,
  selectedFolderId,
  setSelectedFolderId,
  searchQuery,
  setSearchQuery,
  showFavoritesOnly,
  setShowFavoritesOnly,
  newFolderName,
  setNewFolderName,
  isCreatingFolder,
  setIsCreatingFolder,
  activeMenuPromptId,
  setActiveMenuPromptId,
  moveModalPrompt,
  setMoveModalPrompt,
  targetFolderId,
  setTargetFolderId,
  isMoving,
  deleteModalPrompt,
  setDeleteModalPrompt,
  isDeleting,
  errorMessage,
  setErrorMessage,
  successMessage,
  setSuccessMessage,
  displayedPrompts,
  folderMap,
  folderPromptCounts,
  onNewPrompt,
  onCreateFolder,
  onDeleteFolder,
  onToggleFavorite,
  onConfirmMove,
  onConfirmDelete,
  onOpenPlayground,
  comparePrompt,
  setComparePrompt,
  isCompareOpen,
  setIsCompareOpen,
}) => {
  const currentFolder = React.useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f._id === selectedFolderId) || null;
  }, [selectedFolderId, folders]);

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-full bg-slate-50 font-sans text-slate-900">
      <PageHeader
        icon={Sparkles}
        tone="indigo"
        title={
          <span className="flex flex-wrap items-center gap-2">
            Prompt Library
            <span className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium tracking-normal text-slate-500 ring-1 ring-inset ring-slate-200">
              PromptOps v1.0
            </span>
          </span>
        }
        description="Browse reusable prompt templates, organization folders, and versions."
        actions={
          <>
            <Button
              icon={FolderPlus}
              onClick={() => {
                setActiveView("folders");
                setIsCreatingFolder(true);
              }}
            >
              New Folder
            </Button>
            <Button variant="primary" onClick={() => onNewPrompt(onOpenPlayground)} disabled={isCreatingPrompt}>
              {isCreatingPrompt ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> New Prompt
                </>
              )}
            </Button>
          </>
        }
      />

      <div className="space-y-4 px-3 py-4 sm:px-5 lg:px-6">
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setErrorMessage(null)} className="flex h-6 w-6 items-center justify-center rounded text-red-500 hover:bg-red-100 hover:text-red-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setSuccessMessage(null)} className="flex h-6 w-6 items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <PromptLibraryToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeView={activeView}
        setActiveView={setActiveView}
        setSelectedFolderId={setSelectedFolderId}
        promptsCount={prompts.length}
        foldersCount={folders.length}
        showFavoritesOnly={showFavoritesOnly}
        setShowFavoritesOnly={setShowFavoritesOnly}
      />

      {activeView === "prompts" ? (
        <PromptGrid
          prompts={displayedPrompts}
          isLoading={isLoading}
          searchQuery={searchQuery}
          showFavoritesOnly={showFavoritesOnly}
          folderMap={folderMap}
          activeMenuPromptId={activeMenuPromptId}
          isCreatingPrompt={isCreatingPrompt}
          onClearFilters={() => {
            setSearchQuery("");
            setShowFavoritesOnly(false);
          }}
          onNewPrompt={() => onNewPrompt(onOpenPlayground)}
          onOpenPlayground={onOpenPlayground}
          onToggleFavorite={onToggleFavorite}
          onToggleMenu={(id, e) => {
            e.stopPropagation();
            setActiveMenuPromptId(activeMenuPromptId === id ? null : id);
          }}
          onCloseMenu={() => setActiveMenuPromptId(null)}
          onOpenCompare={(prompt) => {
            setComparePrompt(prompt);
            setIsCompareOpen(true);
          }}
          onOpenMoveModal={(prompt, e) => {
            e.stopPropagation();
            setActiveMenuPromptId(null);
            setMoveModalPrompt(prompt);
            setTargetFolderId(prompt.folderId || null);
          }}
          onOpenDeleteModal={(prompt, e) => {
            e.stopPropagation();
            setActiveMenuPromptId(null);
            setDeleteModalPrompt(prompt);
          }}
          formatTimeAgo={formatTimeAgo}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            {selectedFolderId !== null ? (
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={buttonClass("ghost", "sm", "-ml-2")}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Folders
                </button>
                <div className="h-5 w-px bg-slate-200" />
                <div className="flex min-w-0 items-center gap-2">
                  <FolderIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <h2 className="m-0 truncate text-[15px] font-semibold text-slate-900">
                    {currentFolder?.name || "Folder"}
                  </h2>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-inset ring-slate-200">
                    {displayedPrompts.length} prompts
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-slate-400" />
                <h2 className="m-0 text-[15px] font-semibold text-slate-900">All Folders ({folders.length})</h2>
              </div>
            )}

            {isCreatingFolder ? (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className={`${inputClass} h-8 min-w-0 flex-1 sm:w-56`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateFolder();
                    if (e.key === "Escape") setIsCreatingFolder(false);
                  }}
                />
                <button
                  type="button"
                  onClick={onCreateFolder}
                  className={buttonClass("primary", "sm")}
                >
                  Save
                </button>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setIsCreatingFolder(false)}
                  className={buttonClass("ghost", "icon-sm")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingFolder(true)}
                className={buttonClass("secondary", "sm")}
              >
                <FolderPlus className="h-3.5 w-3.5" /> Add Folder
              </button>
            )}
          </div>

          {selectedFolderId !== null ? (
            <PromptGrid
              prompts={displayedPrompts}
              isLoading={isLoading}
              searchQuery={searchQuery}
              showFavoritesOnly={showFavoritesOnly}
              folderMap={folderMap}
              activeMenuPromptId={activeMenuPromptId}
              isCreatingPrompt={isCreatingPrompt}
              onClearFilters={() => {
                setSearchQuery("");
                setShowFavoritesOnly(false);
              }}
              onNewPrompt={() => onNewPrompt(onOpenPlayground)}
              onOpenPlayground={onOpenPlayground}
              onToggleFavorite={onToggleFavorite}
              onToggleMenu={(id, e) => {
                e.stopPropagation();
                setActiveMenuPromptId(activeMenuPromptId === id ? null : id);
              }}
              onCloseMenu={() => setActiveMenuPromptId(null)}
              onOpenCompare={(prompt) => {
                setComparePrompt(prompt);
                setIsCompareOpen(true);
              }}
              onOpenMoveModal={(prompt, e) => {
                e.stopPropagation();
                setActiveMenuPromptId(null);
                setMoveModalPrompt(prompt);
                setTargetFolderId(prompt.folderId || null);
              }}
              onOpenDeleteModal={(prompt, e) => {
                e.stopPropagation();
                setActiveMenuPromptId(null);
                setDeleteModalPrompt(prompt);
              }}
              formatTimeAgo={formatTimeAgo}
            />
          ) : (
            <PromptFolderGrid
              folders={folders}
              isLoading={isLoading}
              folderPromptCounts={folderPromptCounts}
              onSelectFolder={(id) => setSelectedFolderId(id)}
              onDeleteFolder={onDeleteFolder}
              onCreateFolderClick={() => setIsCreatingFolder(true)}
            />
          )}
        </div>
      )}
      </div>

      {comparePrompt && (
        <PromptVersionCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          workspaceId={workspaceId}
          prompt={comparePrompt}
          onOpenPlayground={(p, ver) => {
            onOpenPlayground(p._id, ver || p.version);
          }}
        />
      )}

      {moveModalPrompt && (
        <PromptMoveModal
          prompt={moveModalPrompt}
          folders={folders}
          folderPromptCounts={folderPromptCounts}
          targetFolderId={targetFolderId}
          setTargetFolderId={setTargetFolderId}
          isMoving={isMoving}
          onClose={() => setMoveModalPrompt(null)}
          onConfirmMove={onConfirmMove}
        />
      )}

      {deleteModalPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 space-y-3">
              <h3 className="m-0 text-base font-semibold text-slate-900">Delete prompt?</h3>
              <p className="m-0 text-sm leading-relaxed text-slate-600">
                Are you sure you want to delete <span className="font-semibold text-slate-900">"{deleteModalPrompt.name}"</span>? This action cannot be undone.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalPrompt(null)}
                className={buttonClass("secondary", "sm")}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirmDelete}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
