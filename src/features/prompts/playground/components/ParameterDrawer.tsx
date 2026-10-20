import React, { useState, useEffect } from "react";
import { X, Settings, Cpu, Layers } from "lucide-react";
import { buttonClass, inputClass, selectClass } from "@/components/ui";
import { PromptParameters } from "../hooks/usePlayground";
import { getLlmProviders, getLlmModels, LlmProviderItem, LlmModelItem } from "@/services/aiProviders";

interface ParameterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tempParams: PromptParameters;
  setTempParams: React.Dispatch<React.SetStateAction<PromptParameters>>;
  onSave: () => void;
}

export const ParameterDrawer: React.FC<ParameterDrawerProps> = ({
  isOpen,
  onClose,
  tempParams,
  setTempParams,
  onSave,
}) => {
  const [providers, setProviders] = useState<LlmProviderItem[]>([]);
  const [models, setModels] = useState<LlmModelItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCatalog = async () => {
      try {
        setIsLoadingCatalog(true);
        const provs = await getLlmProviders();
        setProviders(provs.filter((p) => p.isEnabled));

        const currentProvider = tempParams.provider || (provs[0]?.providerId ?? "gemini");
        const mods = await getLlmModels(currentProvider);
        setModels(mods.filter((m) => m.isEnabled));
      } catch (err) {
        console.error("Failed to load LLM catalog in ParameterDrawer", err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, [isOpen]);

  const handleProviderChange = async (newProvider: string) => {
    setTempParams((prev) => ({ ...prev, provider: newProvider }));
    try {
      const mods = await getLlmModels(newProvider);
      const enabledMods = mods.filter((m) => m.isEnabled);
      setModels(enabledMods);
      if (enabledMods.length > 0) {
        const defaultMod = enabledMods.find((m) => m.isDefault) || enabledMods[0];
        setTempParams((prev) => ({ ...prev, modelName: defaultMod.modelId }));
      }
    } catch (err) {
      console.error("Failed to fetch models for provider", err);
    }
  };

  if (!isOpen) return null;

  const currentSelectedModel = models.find((m) => m.modelId === tempParams.modelName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md flex max-h-[90vh] flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="m-0 text-base font-semibold text-slate-900">Model & Execution Parameters</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          {isLoadingCatalog ? (
            <div className="py-6 text-center text-[13px] text-slate-500">Loading LLM Provider Catalog...</div>
          ) : (
            <>
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-slate-500" /> AI Provider
                </label>
                <select
                  value={tempParams.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className={selectClass}
                >
                  {providers.length > 0 ? (
                    providers.map((p) => (
                      <option key={p.providerId} value={p.providerId}>
                        {p.displayName}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="groq">Groq / Local AI</option>
                    </>
                  )}
                </select>
              </div>

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" /> Model Name
                </label>
                <select
                  value={tempParams.modelName}
                  onChange={(e) => setTempParams((prev) => ({ ...prev, modelName: e.target.value }))}
                  className={selectClass}
                >
                  {models.length > 0 ? (
                    models.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName} ({m.modelId})
                      </option>
                    ))
                  ) : (
                    <option value={tempParams.modelName}>{tempParams.modelName}</option>
                  )}
                </select>
                {currentSelectedModel && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                    <span>Context: {currentSelectedModel.contextWindow?.toLocaleString() || 128000} tokens</span>
                    <span>Output: ${currentSelectedModel.outputPricePerMToken}/1M</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-4">
                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-slate-700">Temperature</label>
                    <span className="font-mono text-[13px] text-slate-500">{tempParams.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={tempParams.temperature}
                    onChange={(e) =>
                      setTempParams((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                  <p className="m-0 text-xs text-slate-500">Controls randomness: 0 is strict & deterministic, 1+ is creative.</p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-700">Max Tokens</label>
                  <input
                    type="number"
                    value={tempParams.maxTokens}
                    onChange={(e) =>
                      setTempParams((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))
                    }
                    className={`${inputClass} font-mono`}
                  />
                </div>

                {/* Top P */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-slate-700">Top P</label>
                    <span className="font-mono text-[13px] text-slate-500">{tempParams.topP}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={tempParams.topP}
                    onChange={(e) =>
                      setTempParams((prev) => ({ ...prev, topP: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                </div>

                {/* Response Format */}
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-700">Response Format</label>
                  <select
                    value={tempParams.responseFormat}
                    onChange={(e) =>
                      setTempParams((prev) => ({ ...prev, responseFormat: e.target.value as "text" | "json" }))
                    }
                    className={selectClass}
                  >
                    <option value="text">Plain Text</option>
                    <option value="json">Structured JSON Object</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className={buttonClass("secondary", "sm")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className={buttonClass("primary", "sm")}
          >
            Save Parameters
          </button>
        </div>
      </div>
    </div>
  );
};

