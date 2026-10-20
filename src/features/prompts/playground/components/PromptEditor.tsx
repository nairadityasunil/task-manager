import React from "react";
import { AlignLeft, Code, Plus, Trash2 } from "lucide-react";
import { IPromptMessage } from "@/services/prompts";
import { selectClass, textareaClass } from "@/components/ui";

interface PromptEditorProps {
  editorMode: "blocks" | "raw";
  setEditorMode: (mode: "blocks" | "raw") => void;
  messages: IPromptMessage[];
  setMessages: React.Dispatch<React.SetStateAction<IPromptMessage[]>>;
  body: string;
  setBody: (body: string) => void;
  isEditingPromptContent: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  editorMode,
  setEditorMode,
  messages,
  setMessages,
  body,
  setBody,
  isEditingPromptContent,
}) => {
  const handleAddMessage = () => {
    setMessages((prev) => [...prev, { role: "user", content: "" }]);
  };

  const handleRemoveMessage = (index: number) => {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMessageChange = (index: number, field: "role" | "content", val: string) => {
    setMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, [field]: val } : msg))
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">
          Prompt content editor
        </h3>
        <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 text-[13px] hide-scrollbar">
          <button
            type="button"
            onClick={() => setEditorMode("blocks")}
            className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 font-medium transition ${
              editorMode === "blocks"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" /> Structured Messages
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("raw")}
            className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 font-medium transition ${
              editorMode === "raw"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Raw Text Body
          </button>
        </div>
      </div>

      {editorMode === "blocks" ? (
        <div className="space-y-3">
          {messages.map((msg, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between">
                <select
                  value={msg.role}
                  onChange={(e) => handleMessageChange(index, "role", e.target.value as "system" | "user" | "assistant")}
                  className={`${selectClass} h-8 w-auto text-xs font-medium`}
                  disabled={!isEditingPromptContent}
                >
                  <option value="system">SYSTEM</option>
                  <option value="user">USER</option>
                  <option value="assistant">ASSISTANT</option>
                </select>
                {messages.length > 1 && isEditingPromptContent && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMessage(index)}
                    aria-label="Remove message"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                value={msg.content}
                onChange={(e) => handleMessageChange(index, "content", e.target.value)}
                placeholder={`Enter ${msg.role} template message content...`}
                rows={3}
                className={`${textareaClass} font-mono text-[13px]`}
              />
            </div>
          ))}
          {isEditingPromptContent && (
            <button
              type="button"
              onClick={handleAddMessage}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Message Block
            </button>
          )}
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter complete raw prompt template text here..."
          rows={8}
          className={`${textareaClass} font-mono text-[13px]`}
        />
      )}
    </div>
  );
};
