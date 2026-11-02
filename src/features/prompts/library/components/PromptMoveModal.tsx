import React from "react";
import Modal from '@/components/Modal';
import { Folder as FolderIcon, Loader2, ChevronDown } from "lucide-react";
import { PromptItem, PromptFolder } from "@/services/prompts";
import { buttonClass, selectClass } from "@/components/ui";

import { Select, Radio } from '@/components/ui';
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
    <Modal maxWidth="max-w-sm" onClose={() => !isMoving && onClose()} title={`Move "${prompt.name}" to…`}>
      <div className="-m-4">
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Select Folder
            </label>
            <div className="relative">
              <Select
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
              </Select>
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
              <Radio
                name="targetFolderModal"
                checked={targetFolderId === null}
                onChange={() => setTargetFolderId(null)}
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
                  <Radio
                    name="targetFolderModal"
                    checked={isSelected}
                    onChange={() => setTargetFolderId(f._id)}
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
    </Modal>
  );
};
