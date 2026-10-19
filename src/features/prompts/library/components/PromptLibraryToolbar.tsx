import React from "react";
import { Search, X, Layers, Folder as FolderIcon, Star } from "lucide-react";
import { buttonClass, inputClass } from "@/components/ui";

interface PromptLibraryToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeView: "prompts" | "folders";
  setActiveView: (view: "prompts" | "folders") => void;
  setSelectedFolderId: (id: string | null) => void;
  promptsCount: number;
  foldersCount: number;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (fav: boolean) => void;
}

export const PromptLibraryToolbar: React.FC<PromptLibraryToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  activeView,
  setActiveView,
  setSelectedFolderId,
  promptsCount,
  foldersCount,
  showFavoritesOnly,
  setShowFavoritesOnly,
}) => {
  const viewButton = (view: "prompts" | "folders", label: string, Icon: typeof Layers, count: number) => {
    const active = activeView === view;
    return (
      <button
        type="button"
        onClick={() => {
          setActiveView(view);
          setSelectedFolderId(null);
        }}
        aria-pressed={active}
        className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] sm:px-3 font-medium transition ${
          active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900"
        }`}
      >
        <Icon className="h-3.5 w-3.5" /> {label}
        <span
          className={`rounded-full px-1.5 text-[11px] tabular-nums ${
            active ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-600"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="relative w-full sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search prompts by name, description, tags or body..."
          className={`${inputClass} pl-9 pr-8`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex h-9 select-none items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100/70 p-0.5">
        {viewButton("prompts", "Prompts", Layers, promptsCount)}
        {viewButton("folders", "Folders", FolderIcon, foldersCount)}
      </div>

      <button
        type="button"
        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        aria-pressed={showFavoritesOnly}
        className={buttonClass(
          "secondary",
          "sm",
          showFavoritesOnly ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50 hover:text-amber-900" : undefined
        )}
      >
        <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current text-amber-500" : "text-slate-400"}`} />
        Favorites
      </button>
    </div>
  );
};
