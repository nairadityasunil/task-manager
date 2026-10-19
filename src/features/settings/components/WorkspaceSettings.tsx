import React from "react";
import { Shield } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";

interface WorkspaceSettingsProps {
  currentWorkspace?: { name?: string; id?: string } | null;
}

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ currentWorkspace }) => {
  return (
    <Card className="font-sans">
      <CardHeader
        title="Workspace Profile & Preferences"
        description="Manage organization settings, default policies, and security limits."
      />
      <div className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">
              {currentWorkspace?.name || "Active Workspace"}
            </span>
            <Badge tone="success" dot>Active Workspace</Badge>
          </div>
          <p className="m-0 break-all font-mono text-xs text-slate-500">ID: {currentWorkspace?.id || "N/A"}</p>
        </div>

        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <h5 className="m-0 flex items-center gap-1.5 text-sm font-medium text-slate-900">
            <Shield className="h-4 w-4 text-slate-500" /> Workspace Security & Governance
          </h5>
          <p className="m-0 text-[13px] leading-relaxed text-slate-600">
            All team members assigned to this workspace inherit configured SLA response targets, security constraints, and project visibility controls.
          </p>
        </div>
      </div>
    </Card>
  );
};
