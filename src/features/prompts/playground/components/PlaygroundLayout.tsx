import React from "react";
import { FileText, Plus } from "lucide-react";
import {
  PromptItem,
  PromptFolder,
  PromptVersion,
  PromptCanaryDeployment,
  promptService,
  PlaygroundRunResult,
} from "@/services/prompts";
import { PlaygroundSidebar } from "./PlaygroundSidebar";
import { PromptHeader } from "./PromptHeader";
import { PromptEditor } from "./PromptEditor";
import { VersionSelector } from "./VersionSelector";
import { VariableEditor } from "./VariableEditor";
import { ParameterDrawer } from "./ParameterDrawer";
import { PromptExecutionPanel } from "./PromptExecutionPanel";
import { CanaryDeploymentBanner } from "./CanaryDeploymentBanner";
import { DeployModal } from "./DeployModal";
import { PromptMoveModal } from "../../library/components/PromptMoveModal";
import { PromptVersionCompareModal } from "@/components/PromptVersionCompareModal";
import { PromptParameters } from "../hooks/usePlayground";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui";

interface PlaygroundLayoutProps {
  workspaceId: string;
  folders: PromptFolder[];
  promptsByFolder: Record<string, PromptItem[]>;
  expandedFolders: Record<string, boolean>;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedPromptId: string | null;
  setSelectedPromptId: (id: string | null) => void;
  isLoadingLibrary: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activePrompt: PromptItem | null;
  setActivePrompt: (prompt: PromptItem | null) => void;
  versionsList: PromptVersion[];
  selectedVersionNum: number;
  setSelectedVersionNum: (ver: number) => void;
  activeCanary?: PromptCanaryDeployment | null;
  isDeployModalOpen?: boolean;
  setIsDeployModalOpen?: (open: boolean) => void;
  isCanaryActionLoading?: boolean;
  handleMoveToStaging?: (versionNum: number) => void;
  handleMoveToDevelopment?: (versionNum: number) => void;
  handleDeployDirect?: (versionNum: number) => void;
  handleStartCanary?: (candidateVersionNum: number, options?: { minRequests?: number; errorThreshold?: number }) => void;
  handleAdvanceCanary?: () => void;
  handlePauseCanary?: () => void;
  handleResumeCanary?: () => void;
  handleRollbackCanary?: () => void;
  handleCompleteCanary?: () => void;
  activeTab: "prompt" | "versions" | "variables" | "test";
  setActiveTab: (tab: "prompt" | "versions" | "variables" | "test") => void;
  isEditingPromptContent: boolean;
  setIsEditingPromptContent: (editing: boolean) => void;
  editorMode: "blocks" | "raw";
  setEditorMode: (mode: "blocks" | "raw") => void;
  body: string;
  setBody: (body: string) => void;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  setMessages: React.Dispatch<React.SetStateAction<Array<{ role: "system" | "user" | "assistant"; content: string }>>>;
  variablesSchema: Array<{ name: string; type?: "string" | "number" | "json" | "boolean" | "enum"; defaultValue?: string; required: boolean }>;
  setVariablesSchema: React.Dispatch<React.SetStateAction<Array<{ name: string; type?: "string" | "number" | "json" | "boolean" | "enum"; defaultValue?: string; required: boolean }>>>;
  runtimeValues: Record<string, unknown>;
  setRuntimeValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  parameters: PromptParameters;
  setParameters: React.Dispatch<React.SetStateAction<PromptParameters>>;
  isParametersModalOpen: boolean;
  setIsParametersModalOpen: (open: boolean) => void;
  modalTempParams: PromptParameters;
  setModalTempParams: React.Dispatch<React.SetStateAction<PromptParameters>>;
  isExecuting: boolean;
  setIsExecuting: (executing: boolean) => void;
  runResult: unknown;
  setRunResult: (result: PlaygroundRunResult | null) => void;
  executionError: string | null;
  setExecutionError: (err: string | null) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  isPublishingProduction?: boolean;
  onPublishProduction?: (versionNum: number) => void;
  moveModalPrompt: PromptItem | null;
  setMoveModalPrompt: (prompt: PromptItem | null) => void;
  targetFolderId: string | null;
  setTargetFolderId: (id: string | null) => void;
  isMoving: boolean;
  setIsMoving: (moving: boolean) => void;
  hasVersionedConfigurationChanged: boolean;
  onSavePrompt: () => void;
  onNewPromptImmediate: () => void;
  loadPromptDetails: (promptId: string, versionNumber?: number) => void;
}

export const PlaygroundLayout: React.FC<PlaygroundLayoutProps> = ({
  workspaceId,
  folders,
  promptsByFolder,
  expandedFolders,
  setExpandedFolders,
  selectedPromptId,
  setSelectedPromptId,
  isLoadingLibrary,
  searchQuery,
  setSearchQuery,
  activePrompt,
  setActivePrompt,
  versionsList,
  selectedVersionNum,
  activeCanary,
  isDeployModalOpen = false,
  setIsDeployModalOpen,
  isCanaryActionLoading = false,
  handleMoveToStaging,
  handleMoveToDevelopment,
  handleDeployDirect,
  handleStartCanary,
  handleAdvanceCanary,
  handlePauseCanary,
  handleResumeCanary,
  handleRollbackCanary,
  handleCompleteCanary,
  activeTab,
  setActiveTab,
  isEditingPromptContent,
  setIsEditingPromptContent,
  editorMode,
  setEditorMode,
  body,
  setBody,
  messages,
  setMessages,
  variablesSchema,
  setVariablesSchema,
  runtimeValues,
  setRuntimeValues,
  parameters,
  setParameters,
  isParametersModalOpen,
  setIsParametersModalOpen,
  modalTempParams,
  setModalTempParams,
  isExecuting,
  setIsExecuting,
  runResult,
  setRunResult,
  executionError,
  setExecutionError,
  isSaving,
  isPublishingProduction,
  moveModalPrompt,
  setMoveModalPrompt,
  targetFolderId,
  setTargetFolderId,
  isMoving,
  setIsMoving,
  hasVersionedConfigurationChanged,
  onSavePrompt,
  onPublishProduction,
  onNewPromptImmediate,
  loadPromptDetails,
}) => {
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);

  const folderPromptCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    Object.entries(promptsByFolder).forEach(([fId, items]) => {
      if (fId !== "uncategorized") counts.set(fId, items.length);
    });
    return counts;
  }, [promptsByFolder]);

  const selectedVersionObj = React.useMemo(() => {
    return versionsList.find((v) => v.version === selectedVersionNum) || null;
  }, [versionsList, selectedVersionNum]);

  return (
    <div className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 lg:h-full lg:flex-row lg:overflow-hidden">
      <PlaygroundSidebar
        folders={folders}
        promptsByFolder={promptsByFolder}
        expandedFolders={expandedFolders}
        setExpandedFolders={setExpandedFolders}
        selectedPromptId={selectedPromptId}
        isLoadingLibrary={isLoadingLibrary}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectPrompt={(id) => {
          setSelectedPromptId(id);
          loadPromptDetails(id);
        }}
        onNewPrompt={onNewPromptImmediate}
      />

      <main className="custom-scrollbar flex w-full min-w-0 flex-1 flex-col px-3 py-4 sm:px-5 lg:h-full lg:overflow-y-auto lg:px-6">
        {!selectedPromptId ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <div className="w-full max-w-md">
              <EmptyState
                icon={FileText}
                title="No Prompt Selected"
                description="Select an existing prompt from the left navigation or create a new prompt to get started."
                action={
                  <Button variant="primary" icon={Plus} onClick={onNewPromptImmediate}>
                    Create New Prompt
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl space-y-4">
            {/* Canary Deployment Status Banner */}
            {activeCanary && (
              <CanaryDeploymentBanner
                canary={activeCanary}
                onAdvance={() => handleAdvanceCanary?.()}
                onPause={() => handlePauseCanary?.()}
                onResume={() => handleResumeCanary?.()}
                onRollback={() => handleRollbackCanary?.()}
                onComplete={() => handleCompleteCanary?.()}
                isActionLoading={isCanaryActionLoading}
              />
            )}

            <PromptHeader
              activePrompt={activePrompt}
              selectedVersionNum={selectedVersionNum}
              hasVersionedConfigurationChanged={hasVersionedConfigurationChanged}
              isSaving={isSaving}
              isEditingPromptContent={isEditingPromptContent}
              isPublishingProduction={isPublishingProduction}
              activeCanary={activeCanary}
              onSavePrompt={onSavePrompt}
              onPublishProduction={onPublishProduction}
              onOpenDeployModal={() => setIsDeployModalOpen?.(true)}
              onToggleEditStructure={() => setIsEditingPromptContent(!isEditingPromptContent)}
              onOpenMoveModal={() => {
                if (activePrompt) {
                  setMoveModalPrompt(activePrompt);
                  setTargetFolderId(activePrompt.folderId || null);
                }
              }}
              onOpenParametersModal={() => {
                setModalTempParams(parameters);
                setIsParametersModalOpen(true);
              }}
            />

            <div className="flex w-full gap-5 overflow-x-auto border-b border-slate-200 hide-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("prompt")}
                className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                  activeTab === "prompt"
                    ? "border-emerald-500 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Prompt
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("versions")}
                className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                  activeTab === "versions"
                    ? "border-emerald-500 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Versions ({versionsList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("variables")}
                className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                  activeTab === "variables"
                    ? "border-emerald-500 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Variables ({variablesSchema.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("test")}
                className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                  activeTab === "test"
                    ? "border-emerald-500 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Execution & Test
              </button>
            </div>

            {activeTab === "prompt" && (
              <PromptEditor
                editorMode={editorMode}
                setEditorMode={setEditorMode}
                messages={messages}
                setMessages={setMessages}
                body={body}
                setBody={setBody}
                isEditingPromptContent={isEditingPromptContent}
              />
            )}

            {activeTab === "versions" && (
              <VersionSelector
                activePrompt={activePrompt}
                versionsList={versionsList}
                selectedVersionNum={selectedVersionNum}
                isPublishingProduction={isPublishingProduction}
                activeCanary={activeCanary}
                onSelectVersion={(verNum) => {
                  if (selectedPromptId) loadPromptDetails(selectedPromptId, verNum);
                }}
                onOpenCompare={() => setIsCompareOpen(true)}
                onPublishProduction={onPublishProduction}
              />
            )}

            {activeTab === "variables" && (
              <VariableEditor
                variablesSchema={variablesSchema}
                setVariablesSchema={setVariablesSchema}
                runtimeValues={runtimeValues}
                setRuntimeValues={setRuntimeValues}
                isEditingPromptContent={isEditingPromptContent}
              />
            )}

            {activeTab === "test" && (
              <PromptExecutionPanel
                workspaceId={workspaceId}
                promptId={selectedPromptId}
                body={body}
                messages={messages}
                runtimeValues={runtimeValues}
                parameters={parameters}
                isExecuting={isExecuting}
                setIsExecuting={setIsExecuting}
                runResult={runResult as PlaygroundRunResult | null}
                setRunResult={setRunResult}
                executionError={executionError}
                setExecutionError={setExecutionError}
                onOpenParametersModal={() => {
                  setModalTempParams(parameters);
                  setIsParametersModalOpen(true);
                }}
              />
            )}
          </div>
        )}
      </main>

      <ParameterDrawer
        isOpen={isParametersModalOpen}
        onClose={() => setIsParametersModalOpen(false)}
        tempParams={modalTempParams}
        setTempParams={setModalTempParams}
        onSave={() => {
          setParameters(modalTempParams);
          setIsParametersModalOpen(false);
        }}
      />

      <DeployModal
        isOpen={isDeployModalOpen}
        activePrompt={activePrompt}
        selectedVersion={selectedVersionObj}
        versionsList={versionsList}
        onClose={() => setIsDeployModalOpen?.(false)}
        onMoveToStaging={(ver) => handleMoveToStaging?.(ver)}
        onMoveToDevelopment={(ver) => handleMoveToDevelopment?.(ver)}
        onDeployDirect={(ver) => handleDeployDirect?.(ver)}
        onStartCanary={(cand, opts) => handleStartCanary?.(cand, opts)}
        isLoading={isCanaryActionLoading}
      />

      {moveModalPrompt && (
        <PromptMoveModal
          prompt={moveModalPrompt}
          folders={folders}
          folderPromptCounts={folderPromptCounts}
          targetFolderId={targetFolderId}
          setTargetFolderId={setTargetFolderId}
          isMoving={isMoving}
          onClose={() => setMoveModalPrompt(null)}
          onConfirmMove={async () => {
            if (!moveModalPrompt) return;
            try {
              setIsMoving(true);
              const updated = await promptService.updatePrompt(
                workspaceId,
                moveModalPrompt._id,
                { folderId: targetFolderId }
              );
              if (activePrompt && activePrompt._id === updated._id) {
                setActivePrompt(updated);
              }
              setMoveModalPrompt(null);
            } catch (err) {
              console.error("Failed to move prompt", err);
            } finally {
              setIsMoving(false);
            }
          }}
        />
      )}

      {activePrompt && (
        <PromptVersionCompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          workspaceId={workspaceId}
          prompt={activePrompt}
          onOpenPlayground={(p, ver) => {
            if (p._id) loadPromptDetails(p._id, ver);
          }}
        />
      )}
    </div>
  );
};
