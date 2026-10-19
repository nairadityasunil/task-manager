import React from "react";
import { Folder as FolderIcon, Trash2, FolderPlus } from "lucide-react";
import { PromptFolder } from "@/services/prompts";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";

interface PromptFolderGridProps {
  folders: PromptFolder[];
  isLoading: boolean;
  folderPromptCounts: Map<string, number>;
  onSelectFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string, e: React.MouseEvent) => void;
  onCreateFolderClick: () => void;
}

export const PromptFolderGrid: React.FC<PromptFolderGridProps> = ({
  folders,
  isLoading,
  folderPromptCounts,
  onSelectFolder,
  onDeleteFolder,
  onCreateFolderClick,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <EmptyState
        icon={FolderIcon}
        title="No folders yet"
        description="Create a folder to organize your prompts into logical groups."
        action={
          <Button variant="primary" icon={FolderPlus} onClick={onCreateFolderClick}>
            Create Folder
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {folders.map((f) => {
        const count = folderPromptCounts.get(f._id) || 0;
        return (
          <div
            key={f._id}
            onClick={() => onSelectFolder(f._id)}
            className="group flex min-w-0 cursor-pointer flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition group-hover:text-slate-800">
                  <FolderIcon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 truncate text-[15px] font-semibold text-slate-900">{f.name}</h3>
                  {f.description && (
                    <p className="m-0 mt-0.5 line-clamp-1 text-[13px] text-slate-500">{f.description}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => onDeleteFolder(f._id, e)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                title="Delete folder"
                aria-label="Delete folder"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                {count} {count === 1 ? "prompt" : "prompts"}
              </span>
              <span className="text-[13px] font-medium text-slate-700 transition group-hover:text-slate-900">
                View Folder →
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
