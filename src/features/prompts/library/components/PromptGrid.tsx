import React from "react";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { PromptItem } from "@/services/prompts";
import { PromptCard } from "./PromptCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";

interface PromptGridProps {
  prompts: PromptItem[];
  isLoading: boolean;
  searchQuery: string;
  showFavoritesOnly: boolean;
  folderMap: Map<string, string>;
  activeMenuPromptId: string | null;
  isCreatingPrompt: boolean;
  onClearFilters: () => void;
  onNewPrompt: () => void;
  onOpenPlayground: (promptId: string, version: number) => void;
  onToggleFavorite: (promptId: string, e: React.MouseEvent) => void;
  onToggleMenu: (promptId: string, e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onOpenCompare: (prompt: PromptItem) => void;
  onOpenMoveModal: (prompt: PromptItem, e: React.MouseEvent) => void;
  onOpenDeleteModal: (prompt: PromptItem, e: React.MouseEvent) => void;
  formatTimeAgo: (dateString?: string) => string;
}

export const PromptGrid: React.FC<PromptGridProps> = ({
  prompts,
  isLoading,
  searchQuery,
  showFavoritesOnly,
  folderMap,
  activeMenuPromptId,
  isCreatingPrompt,
  onClearFilters,
  onNewPrompt,
  onOpenPlayground,
  onToggleFavorite,
  onToggleMenu,
  onCloseMenu,
  onOpenCompare,
  onOpenMoveModal,
  onOpenDeleteModal,
  formatTimeAgo,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-14 animate-pulse rounded-lg bg-slate-50" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (prompts.length === 0) {
    const filtered = Boolean(searchQuery || showFavoritesOnly);
    return (
      <EmptyState
        icon={Sparkles}
        title="No prompts found"
        description={
          filtered
            ? "No prompts match your current filter parameters. Try clearing your search filters."
            : "Create your first prompt to start building and testing reusable prompts."
        }
        action={
          filtered ? (
            <Button onClick={onClearFilters}>Clear Filters</Button>
          ) : (
            <Button variant="primary" onClick={onNewPrompt} disabled={isCreatingPrompt}>
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
          )
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {prompts.map((p) => (
        <PromptCard
          key={p._id}
          prompt={p}
          folderName={p.folderId ? folderMap.get(p.folderId) || null : null}
          isMenuOpen={activeMenuPromptId === p._id}
          onOpenPlayground={onOpenPlayground}
          onToggleFavorite={onToggleFavorite}
          onToggleMenu={onToggleMenu}
          onCloseMenu={onCloseMenu}
          onOpenCompare={onOpenCompare}
          onOpenMoveModal={onOpenMoveModal}
          onOpenDeleteModal={onOpenDeleteModal}
          formatTimeAgo={formatTimeAgo}
        />
      ))}
    </div>
  );
};
