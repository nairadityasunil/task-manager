import React from "react";
import {
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  Search,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
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
    <aside className="w-full md:w-72 max-h-[40vh] md:max-h-none bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full shrink-0 select-none">
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> PROMPT EXPLORER
          </span>
          <button
            type="button"
            onClick={onNewPrompt}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title="Create New Prompt"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-3 custom-scrollbar text-xs">
        {isLoadingLibrary ? (
          <div className="text-center py-8 text-slate-400 text-xs">Loading library...</div>
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
                    className="w-full text-left px-2 py-1 rounded hover:bg-slate-100/70 text-slate-600 font-medium text-[11px] uppercase tracking-wide flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : (
                        <FolderIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate font-semibold">{folder.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">
                      {folderPrompts.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="space-y-0.5 pl-1">
                      {folderPrompts.length === 0 ? (
                        <div className="px-3 py-1 text-[11px] text-slate-400 italic">No prompts</div>
                      ) : (
                        folderPrompts.map((p) => {
                          const isSelected = selectedPromptId === p._id;
                          return (
                            <div
                              key={p._id}
                              onClick={() => onSelectPrompt(p._id)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg transition group cursor-pointer border ${
                                isSelected
                                  ? "bg-slate-50/80 border-slate-300/80 text-slate-950 font-medium"
                                  : "border-transparent text-slate-700 hover:bg-slate-100/80"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-slate-700" : "text-slate-400"}`} />
                                  <span className={`truncate text-xs ${isSelected ? "font-semibold text-slate-950" : "font-medium text-slate-800"}`}>{p.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                                  {p.version > 0 ? `v${p.version}` : "Draft"}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5 pl-5">
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

            <div className="space-y-0.5 pt-2 border-t border-slate-200">
              <div className="px-2 py-1 text-[11px] font-medium text-slate-500 uppercase tracking-wide flex items-center justify-between">
                <span>ALL PROMPTS</span>
                <span className="text-[11px] text-slate-400 font-mono">
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
                          ? "bg-slate-50/80 border-slate-300/80 text-slate-950 font-medium"
                          : "border-transparent text-slate-700 hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-slate-700" : "text-slate-400"}`} />
                          <span className={`truncate text-xs ${isSelected ? "font-semibold text-slate-950" : "font-medium text-slate-800"}`}>{p.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                          {p.version > 0 ? `v${p.version}` : "Draft"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 pl-5">
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
