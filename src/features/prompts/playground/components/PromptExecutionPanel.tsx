import React from "react";
import { Play, Copy, Check, Settings, Loader2 } from "lucide-react";
import { PlaygroundRunResult, promptService, IPromptMessage } from "@/services/prompts";
import { PromptParameters } from "../hooks/usePlayground";
import EmptyState from "@/components/EmptyState";
import { buttonClass } from "@/components/ui";

interface PromptExecutionPanelProps {
  workspaceId: string;
  promptId: string | null;
  body: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  runtimeValues: Record<string, unknown>;
  parameters: PromptParameters;
  isExecuting: boolean;
  setIsExecuting: (executing: boolean) => void;
  runResult: PlaygroundRunResult | null;
  setRunResult: (result: PlaygroundRunResult | null) => void;
  executionError: string | null;
  setExecutionError: (err: string | null) => void;
  onOpenParametersModal: () => void;
}

export const PromptExecutionPanel: React.FC<PromptExecutionPanelProps> = ({
  workspaceId,
  promptId,
  body,
  messages,
  runtimeValues,
  parameters,
  isExecuting,
  setIsExecuting,
  runResult,
  setRunResult,
  executionError,
  setExecutionError,
  onOpenParametersModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleRunPlayground = async () => {
    try {
      setIsExecuting(true);
      setExecutionError(null);
      const result = await promptService.runPlayground(workspaceId, {
        promptId: promptId || undefined,
        body,
        messages: messages as IPromptMessage[],
        variables: runtimeValues,
        parameters: {
          temperature: parameters.temperature,
          maxTokens: parameters.maxTokens,
          topP: parameters.topP,
        },
        provider: parameters.provider,
        modelName: parameters.modelName,
      });
      setRunResult(result);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setExecutionError(errorObj.response?.data?.message || errorObj.message || "Failed to execute prompt run.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyOutput = () => {
    if (runResult?.output) {
      navigator.clipboard.writeText(runResult.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">
          Playground execution output
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenParametersModal}
            className={buttonClass("secondary", "sm", "max-w-full")}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">Config ({parameters.modelName})</span>
          </button>

          <button
            type="button"
            onClick={handleRunPlayground}
            disabled={isExecuting}
            className={buttonClass("primary", "sm")}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Test Prompt
              </>
            )}
          </button>
        </div>
      </div>

      {executionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          {executionError}
        </div>
      )}

      {runResult ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Model: <strong className="font-medium text-slate-900">{runResult.metadata?.modelName || parameters.modelName}</strong></span>
              <span>Tokens: <strong className="font-medium text-slate-900">{runResult.metadata?.totalTokens || 0}</strong></span>
              <span>Latency: <strong className="font-medium text-slate-900">{runResult.metadata?.latencyMs || 0}ms</strong></span>
            </div>
            <button
              type="button"
              onClick={handleCopyOutput}
              className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy Output"}
            </button>
          </div>

          <div className="min-h-[160px] overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900 p-4 font-mono text-[13px] leading-relaxed text-slate-100">
            {runResult.output || "No output returned from playground model execution."}
          </div>
        </div>
      ) : (
        <EmptyState
          compact
          icon={Play}
          title="No Execution Run Output"
          description='Click "Run Test Prompt" above to execute your prompt template against selected model AI providers.'
        />
      )}
    </div>
  );
};
