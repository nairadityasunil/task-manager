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
      className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-400 transition-all shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group space-y-4 relative"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-950 group-hover:text-slate-700 transition truncate">
                {prompt.name}
              </h3>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                {prompt.version > 0 ? `v${prompt.version}` : "Draft"}
              </span>
              {prompt.productionVersion && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  Prod v{prompt.productionVersion}
                </span>
              )}
            </div>
            {prompt.description && (
              <p className="text-xs text-slate-600 line-clamp-1">
                {prompt.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 relative">
            <button
              type="button"
              onClick={(e) => onToggleFavorite(prompt._id, e)}
              className={`p-1.5 rounded-lg transition ${
                prompt.isFavorite
                  ? "text-amber-500 bg-amber-50"
                  : "text-slate-300 hover:text-amber-500 hover:bg-slate-50"
              }`}
              title={prompt.isFavorite ? "Remove favorite" : "Add to favorites"}
            >
              <Star className={`w-4 h-4 ${prompt.isFavorite ? "fill-current" : ""}`} />
            </button>

            <button
              type="button"
              aria-label={`Open actions for ${prompt.name}`}
              onClick={(e) => onToggleMenu(prompt._id, e)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isMenuOpen
                  ? "bg-slate-100 text-slate-900 border-slate-300"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 w-44 bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1 font-sans text-xs animate-in fade-in duration-100"
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
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 font-mono text-xs text-slate-800 line-clamp-3 leading-relaxed">
          {prompt.body || (prompt.messages && prompt.messages.length > 0 ? prompt.messages[0].content : "No body content")}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {folderName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-800 border border-slate-200">
              <FolderIcon className="w-3 h-3 text-slate-600" />
              {folderName}
            </span>
          )}

          {(prompt.variables || []).length > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
              {(prompt.variables || []).length} vars
            </span>
          )}

          {prompt.hash && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              {prompt.hash.slice(0, 7)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatTimeAgo(prompt.updatedAt || prompt.createdAt)}
          </span>
          <span>•</span>
          <span className="truncate max-w-[120px]">
            {prompt.createdBy?.name || "User"}
          </span>
        </div>
      </div>
    </div>
  );
};
