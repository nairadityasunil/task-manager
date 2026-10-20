import React from "react";
import { Braces, Plus, Trash2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { buttonClass, inputClass } from "@/components/ui";
import { IPromptVariable } from "@/services/prompts";

interface VariableEditorProps {
  variablesSchema: IPromptVariable[];
  setVariablesSchema: React.Dispatch<React.SetStateAction<IPromptVariable[]>>;
  runtimeValues: Record<string, unknown>;
  setRuntimeValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  isEditingPromptContent: boolean;
}

export const VariableEditor: React.FC<VariableEditorProps> = ({
  variablesSchema,
  setVariablesSchema,
  runtimeValues,
  setRuntimeValues,
  isEditingPromptContent,
}) => {
  const handleAddVariable = () => {
    setVariablesSchema((prev) => [
      ...prev,
      { name: `var_${prev.length + 1}`, type: "string", required: true },
    ]);
  };

  const handleRemoveVariable = (index: number) => {
    setVariablesSchema((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariableChange = (index: number, field: keyof IPromptVariable, val: unknown) => {
    setVariablesSchema((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">
          Template variables schema
        </h3>
        {isEditingPromptContent && (
          <button
            type="button"
            onClick={handleAddVariable}
            className={buttonClass("secondary", "sm")}
          >
            <Plus className="w-3.5 h-3.5" /> Add Variable
          </button>
        )}
      </div>

      {variablesSchema.length === 0 ? (
        <EmptyState
          compact
          icon={Braces}
          title="No variables"
          description="No variables defined for this prompt template."
        />
      ) : (
        <div className="space-y-3">
          {variablesSchema.map((v, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => handleVariableChange(index, "name", e.target.value)}
                  placeholder="Variable name"
                  disabled={!isEditingPromptContent}
                  aria-label="Variable name"
                  className={`${inputClass} h-8 min-w-0 flex-1 font-mono text-[13px]`}
                />
                {isEditingPromptContent && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariable(index)}
                    aria-label="Remove variable"
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Test Runtime Value
                  </label>
                  <input
                    type="text"
                    value={String(runtimeValues[v.name] ?? "")}
                    onChange={(e) =>
                      setRuntimeValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                    }
                    placeholder={`Enter value for ${v.name}...`}
                    className={`${inputClass} h-8 text-[13px]`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Default Schema Value
                  </label>
                  <input
                    type="text"
                    value={v.defaultValue || ""}
                    onChange={(e) => handleVariableChange(index, "defaultValue", e.target.value)}
                    placeholder="Default fallback"
                    disabled={!isEditingPromptContent}
                    className={`${inputClass} h-8 text-[13px]`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
