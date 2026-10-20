import React from "react";
import {
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  Search,
  Plus,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { inputClass } from "@/components/ui";
import { PromptItem, PromptFolder } from "@/services/prompts";

interface PlaygroundSidebarProps {
  folders: PromptFolder[];
  promptsByFolder: Record<string, PromptItem[]>;
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedPromptId: string | null;
  isLoadingLibrary: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectPrompt: (promptId: string) => void;
  onNewPrompt: () => void;
}

export const PlaygroundSidebar: React.FC<PlaygroundSidebarProps> = ({
  folders,
  promptsByFolder,
  expandedFolders,
  setExpandedFolders,
  selectedPromptId,
  isLoadingLibrary,
  searchQuery,
  setSearchQuery,
  onSelectPrompt,
  onNewPrompt,
}) => {
  return (
    <aside className="flex max-h-80 w-full shrink-0 select-none flex-col border-b border-slate-200 bg-white lg:h-full lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" /> Prompt explorer
          </span>
          <button
            type="button"
            onClick={onNewPrompt}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            title="Create New Prompt"
            aria-label="Create New Prompt"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className={`${inputClass} h-8 pl-8 text-[13px]`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-3 custom-scrollbar">
        {isLoadingLibrary ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading library...</div>
        ) : (
          <div className="space-y-3">
            {folders.map((folder) => {
              const folderPrompts = promptsByFolder[folder._id] || [];
              const isExpanded = expandedFolders[folder._id] ?? true;

              return (
                <div key={folder._id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFolders((prev) => ({
                        ...prev,
                        [folder._id]: !prev[folder._id],
                      }))
                    }
                    className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : (
                        <FolderIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-1.5 text-[11px] tabular-nums text-slate-500">
                      {folderPrompts.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-0.5 pl-1">
                      {folderPrompts.length === 0 ? (
                        <div className="px-3 py-1 text-xs text-slate-400">No prompts</div>
                      ) : (
                        folderPrompts.map((p) => {
                          const isSelected = selectedPromptId === p._id;
                          return (
                            <div
                              key={p._id}
                              onClick={() => onSelectPrompt(p._id)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg transition group cursor-pointer border ${
                                isSelected
                                  ? "border-slate-200 bg-slate-100 text-slate-900"
                                  : "border-transparent text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-slate-700" : "text-slate-400"}`} />
                                  <span className={`truncate text-[13px] font-medium ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{p.name}</span>
                                </div>
                                <span className="shrink-0 font-mono text-[11px] text-slate-400">
                                  {p.version > 0 ? `v${p.version}` : "Draft"}
                                </span>
                              </div>
                              <div className="mt-0.5 truncate pl-5 text-xs text-slate-500">
                                {p.description || "Created from Prompt Library"}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="space-y-0.5 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-medium text-slate-500">
                <span>All prompts</span>
                <span className="rounded-full bg-slate-100 px-1.5 text-[11px] tabular-nums text-slate-500">
                  {(promptsByFolder.uncategorized || []).length}
                </span>
              </div>

              <div className="space-y-0.5">
                {(promptsByFolder.uncategorized || []).map((p) => {
                  const isSelected = selectedPromptId === p._id;
                  return (
                    <div
                      key={p._id}
                      onClick={() => onSelectPrompt(p._id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition group cursor-pointer border ${
                        isSelected
                          ? "border-slate-200 bg-slate-100 text-slate-900"
                          : "border-transparent text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-slate-700" : "text-slate-400"}`} />
                          <span className={`truncate text-[13px] font-medium ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{p.name}</span>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-slate-400">
                          {p.version > 0 ? `v${p.version}` : "Draft"}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate pl-5 text-xs text-slate-500">
                        {p.description || "Created from Prompt Library"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
