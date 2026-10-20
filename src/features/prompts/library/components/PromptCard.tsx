import React, { useRef } from "react";
import {
  Folder as FolderIcon,
  Star,
  GitBranch,
  Trash2,
  Clock,
  MoreVertical,
  Edit3,
  FolderInput,
} from "lucide-react";
import { PromptItem } from "@/services/prompts";

interface PromptCardProps {
  prompt: PromptItem;
  folderName: string | null;
  isMenuOpen: boolean;
  onOpenPlayground: (promptId: string, version: number) => void;
  onToggleFavorite: (promptId: string, e: React.MouseEvent) => void;
  onToggleMenu: (promptId: string, e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onOpenCompare: (prompt: PromptItem) => void;
  onOpenMoveModal: (prompt: PromptItem, e: React.MouseEvent) => void;
  onOpenDeleteModal: (prompt: PromptItem, e: React.MouseEvent) => void;
  formatTimeAgo: (dateString?: string) => string;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  folderName,
  isMenuOpen,
  onOpenPlayground,
  onToggleFavorite,
  onToggleMenu,
  onCloseMenu,
  onOpenCompare,
  onOpenMoveModal,
  onOpenDeleteModal,
  formatTimeAgo,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      onClick={() => onOpenPlayground(prompt._id, prompt.version)}
      className="group relative flex min-w-0 cursor-pointer flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] card-hover"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="m-0 min-w-0 truncate text-[15px] font-semibold text-slate-900">
                {prompt.name}
              </h3>
              <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                {prompt.version > 0 ? `v${prompt.version}` : "Draft"}
              </span>
              {prompt.productionVersion && (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Prod v{prompt.productionVersion}
                </span>
              )}
            </div>
            {prompt.description && (
              <p className="m-0 line-clamp-1 text-[13px] text-slate-500">
                {prompt.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 relative">
            <button
              type="button"
              onClick={(e) => onToggleFavorite(prompt._id, e)}
              aria-label={prompt.isFavorite ? "Remove favorite" : "Add to favorites"}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                prompt.isFavorite
                  ? "text-amber-500 hover:bg-amber-50"
                  : "text-slate-400 hover:bg-slate-100 hover:text-amber-500"
              }`}
              title={prompt.isFavorite ? "Remove favorite" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${prompt.isFavorite ? "fill-current" : ""}`} />
            </button>

            <button
              type="button"
              aria-label={`Open actions for ${prompt.name}`}
              onClick={(e) => onToggleMenu(prompt._id, e)}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition ${
                isMenuOpen ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white py-1 font-sans text-[13px] shadow-lg animate-in fade-in duration-100"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPlayground(prompt._id, prompt.version);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseMenu();
                    onOpenCompare(prompt);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                  <span>Compare</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => onOpenMoveModal(prompt, e)}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                  <span>Move to Folder</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={(e) => onOpenDeleteModal(prompt, e)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="line-clamp-3 break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-slate-700">
          {prompt.body || (prompt.messages && prompt.messages.length > 0 ? prompt.messages[0].content : "No body content")}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {folderName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              <FolderIcon className="w-3 h-3 text-slate-400" />
              {folderName}
            </span>
          )}

          {(prompt.variables || []).length > 0 && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
              {(prompt.variables || []).length} vars
            </span>
          )}

          {prompt.hash && (
            <span className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-500 ring-1 ring-inset ring-slate-200">
              {prompt.hash.slice(0, 7)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatTimeAgo(prompt.updatedAt || prompt.createdAt)}
          </span>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">
            {prompt.createdBy?.name || "User"}
          </span>
        </div>
      </div>
    </div>
  );
};
