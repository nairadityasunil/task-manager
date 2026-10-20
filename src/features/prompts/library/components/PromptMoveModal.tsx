import React from "react";
import { Folder as FolderIcon, X, Loader2, ChevronDown } from "lucide-react";
import { PromptItem, PromptFolder } from "@/services/prompts";
import { buttonClass, selectClass } from "@/components/ui";

interface PromptMoveModalProps {
  prompt: PromptItem;
  folders: PromptFolder[];
  folderPromptCounts: Map<string, number>;
  targetFolderId: string | null;
  setTargetFolderId: (id: string | null) => void;
  isMoving: boolean;
  onClose: () => void;
  onConfirmMove: () => Promise<void>;
}

export const PromptMoveModal: React.FC<PromptMoveModalProps> = ({
  prompt,
  folders,
  folderPromptCounts,
  targetFolderId,
  setTargetFolderId,
  isMoving,
  onClose,
  onConfirmMove,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <h3 className="m-0 min-w-0 truncate text-base font-semibold text-slate-900">
            Move "{prompt.name}" to...
          </h3>
          <button
            type="button"
            onClick={() => !isMoving && onClose()}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Select Folder
            </label>
            <div className="relative">
              <select
                value={targetFolderId || ""}
                onChange={(e) => setTargetFolderId(e.target.value || null)}
                className={`${selectClass} cursor-pointer appearance-none`}
              >
                <option value="">Uncategorized / No Folder</option>
                {folders.map((f) => {
                  const count = folderPromptCounts.get(f._id) || 0;
                  return (
                    <option key={f._id} value={f._id}>
                      {f.name} ({count})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar text-[13px] pt-1">
            <label
              onClick={() => setTargetFolderId(null)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                targetFolderId === null
                  ? "bg-emerald-50/60 border-emerald-500 font-medium text-slate-900"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderIcon className={`w-4 h-4 ${targetFolderId === null ? "text-slate-700" : "text-slate-400"}`} />
                <span>Uncategorized / No Folder</span>
              </div>
              <input
                type="radio"
                name="targetFolderModal"
                checked={targetFolderId === null}
                onChange={() => setTargetFolderId(null)}
                className="accent-slate-700 cursor-pointer"
              />
            </label>

            {folders.map((f) => {
              const isSelected = targetFolderId === f._id;
              const count = folderPromptCounts.get(f._id) || 0;
              return (
                <label
                  key={f._id}
                  onClick={() => setTargetFolderId(f._id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? "bg-emerald-50/60 border-emerald-500 font-medium text-slate-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className={`w-4 h-4 ${isSelected ? "text-slate-700" : "text-slate-400"}`} />
                    <span>{f.name}</span>
                    <span className="text-xs text-slate-400">({count})</span>
                  </div>
                  <input
                    type="radio"
                    name="targetFolderModal"
                    checked={isSelected}
                    onChange={() => setTargetFolderId(f._id)}
                    className="accent-slate-700 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button
            type="button"
            disabled={isMoving}
            onClick={onClose}
            className={buttonClass("secondary", "sm")}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isMoving}
            onClick={onConfirmMove}
            className={buttonClass("primary", "sm")}
          >
            {isMoving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Moving...
              </>
            ) : (
              "Move"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
