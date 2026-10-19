import React from "react";
import { UserCircle, Settings2, TimerReset, Sparkles, Smartphone, Bot, Loader2 } from "lucide-react";
import { ProfileSettings } from "./ProfileSettings";
import { ChatGPTIntegrationSettings } from "./ChatGPTIntegrationSettings";
import { CompanionDevicesList } from "./CompanionDevicesList";
import { CompanionDeviceModal } from "./CompanionDeviceModal";
import { McpIntegrationSettings } from "./McpIntegrationSettings";
import { WorkspaceSettingsPanel } from "@/features/workspaces";
import { Card, CardHeader, inputClass } from "@/components/ui";
import type { TaskPriority } from "@/types/task";
import type { AuthProfile } from "@/store/authSlice";
import type { CompanionDevice } from "../hooks/useSettings";
import type { Project } from "@/types/project";

type SettingsTab = "profile" | "workspace" | "sla" | "chatgpt" | "companion" | "mcp";

const SLA_DOT: Partial<Record<TaskPriority, string>> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-sky-500",
  LOW: "bg-slate-400",
};

interface SettingsLayoutProps {
  user: AuthProfile | null;
  activeTab: "profile" | "workspace" | "sla" | "chatgpt" | "companion" | "mcp";
  setActiveTab: (tab: "profile" | "workspace" | "sla" | "chatgpt" | "companion" | "mcp") => void;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  apiKeyCopied: boolean;
  schemaCopied: boolean;
  instructionsCopied: boolean;
  isRegeneratingKey: boolean;
  companionDevices: CompanionDevice[];
  isCompanionModalOpen: boolean;
  setIsCompanionModalOpen: (open: boolean) => void;
  setSelectedDeviceForRegen: (device: CompanionDevice | null) => void;
  isLoadingCompanionDevices: boolean;
  slaConfigs: Record<TaskPriority, number>;
  isLoadingSla: boolean;
  isSavingSla: boolean;
  onCopyApiKey: (text: string) => void;
  onCopySchema: () => void;
  onCopyInstructions: () => void;
  onRegenerateKey: () => void;
  createCompanionDeviceAndKey: (name: string, type: string) => Promise<{ pairingKey: string; device: CompanionDevice }>;
  onRevokeCompanionDevice: (id: string) => void;
  onSaveSlaConfig: (priority: TaskPriority, hours: number) => void;
  fetchCompanionDevices: () => Promise<void>;
  projects: Project[];
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  user,
  activeTab,
  setActiveTab,
  showKey,
  setShowKey,
  apiKeyCopied,
  schemaCopied,
  instructionsCopied,
  isRegeneratingKey,
  companionDevices,
  isCompanionModalOpen,
  setIsCompanionModalOpen,
  setSelectedDeviceForRegen,
  isLoadingCompanionDevices,
  slaConfigs,
  isLoadingSla,
  isSavingSla,
  onCopyApiKey,
  onCopySchema,
  onCopyInstructions,
  onRegenerateKey,
  createCompanionDeviceAndKey,
  onRevokeCompanionDevice,
  onSaveSlaConfig,
  fetchCompanionDevices,
}) => {
  const navItems: Array<{ id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: "profile", label: "Profile & API Key", icon: UserCircle },
    { id: "workspace", label: "Workspace", icon: Settings2 },
    { id: "sla", label: "SLA Targets", icon: TimerReset },
    { id: "chatgpt", label: "ChatGPT Integration", icon: Sparkles },
    { id: "mcp", label: "MCP Integration", icon: Bot },
    { id: "companion", label: "Companion Devices", icon: Smartphone },
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 font-sans lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <h2 className="sr-only">System & Account Settings</h2>
      {/* Section navigation: scrolling tabs on phones/tablets, left rail on desktop */}
      <nav aria-label="Settings sections" className="-mx-4 border-b border-slate-200 px-4 sm:mx-0 sm:px-0 lg:border-b-0">
        <div className="-mb-px flex gap-5 overflow-x-auto hide-scrollbar lg:sticky lg:top-0 lg:mb-0 lg:flex-col lg:gap-0.5 lg:overflow-visible">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors lg:h-9 lg:rounded-lg lg:border-b-0 lg:px-3 lg:py-0 ${
                  active
                    ? "border-slate-900 text-slate-900 lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-slate-200"
                    : "border-transparent text-slate-500 hover:text-slate-900 lg:hover:bg-slate-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-slate-700" : "text-slate-400"}`} /> {label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 space-y-5">
      {activeTab === "profile" && (
        <ProfileSettings
          user={user}
          showKey={showKey}
          setShowKey={setShowKey}
          apiKeyCopied={apiKeyCopied}
          isRegeneratingKey={isRegeneratingKey}
          onCopyApiKey={onCopyApiKey}
          onRegenerateKey={onRegenerateKey}
        />
      )}

      {activeTab === "workspace" && (
        <WorkspaceSettingsPanel />
      )}

      {activeTab === "sla" && (
        <Card>
          <CardHeader
            title="SLA Target Response Times"
            description="Set target resolution windows in hours for task priorities across your team."
          />
          {isLoadingSla ? (
            <div className="flex items-center justify-center gap-2 p-8 text-[13px] text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading SLA configurations...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-5">Priority</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-5">Target window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as TaskPriority[]).map((priority) => (
                    <tr key={priority}>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${SLA_DOT[priority] ?? "bg-slate-400"}`} />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">
                              {priority.charAt(0) + priority.slice(1).toLowerCase()} priority
                            </div>
                            <p className="m-0 text-xs text-slate-500">Target response window in hours</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="1"
                            max="720"
                            value={slaConfigs[priority] || 24}
                            onChange={(e) => onSaveSlaConfig(priority, parseInt(e.target.value) || 24)}
                            disabled={isSavingSla}
                            aria-label={`${priority} Priority`}
                            className={`${inputClass} w-24 text-right font-mono tabular-nums`}
                          />
                          <span className="text-[13px] text-slate-500">hours</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "chatgpt" && (
        <ChatGPTIntegrationSettings
          schemaCopied={schemaCopied}
          instructionsCopied={instructionsCopied}
          onCopySchema={onCopySchema}
          onCopyInstructions={onCopyInstructions}
          onNavigateToProfile={() => setActiveTab("profile")}
        />
      )}

      {activeTab === "mcp" && (
        <McpIntegrationSettings
          companionDevices={companionDevices}
          isLoadingCompanionDevices={isLoadingCompanionDevices}
          onRevokeCompanionDevice={onRevokeCompanionDevice}
          onNavigateToProfile={() => setActiveTab("profile")}
          onOpenCompanionModal={() => {
            setSelectedDeviceForRegen(null);
            setIsCompanionModalOpen(true);
          }}
        />
      )}

      {activeTab === "companion" && (
        <CompanionDevicesList
          devices={companionDevices}
          isLoading={isLoadingCompanionDevices}
          onOpenCreateModal={() => {
            setSelectedDeviceForRegen(null);
            setIsCompanionModalOpen(true);
          }}
          onOpenPairModal={() => {
            setSelectedDeviceForRegen(null);
            setIsCompanionModalOpen(true);
          }}
          onRegenerateKey={(device) => {
            setSelectedDeviceForRegen(device);
            setIsCompanionModalOpen(true);
          }}
          onRevokeDevice={onRevokeCompanionDevice}
        />
      )}

      {isCompanionModalOpen && (
        <CompanionDeviceModal
          isOpen={isCompanionModalOpen}
          onClose={() => {
            setIsCompanionModalOpen(false);
            setSelectedDeviceForRegen(null);
          }}
          onCreateDevice={createCompanionDeviceAndKey}
          onRefreshDevices={fetchCompanionDevices}
        />
      )}
      </div>
    </div>
  );
};
