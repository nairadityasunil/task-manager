import React from "react";
import { KeyRound, RefreshCcw, ShieldHalf } from "lucide-react";
import { Link } from "react-router-dom";
import type { AuthProfile } from "@/store/authSlice";
import { Badge, Button, Card, CardHeader, avatarColor, buttonClass } from "@/components/ui";
import { SecretReveal } from "@/features/agents/components/shared";

interface ProfileSettingsProps {
  user: AuthProfile | null;
  /** Set right after a new key is created; never available afterwards. */
  personalKey?: string | null;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  apiKeyCopied: boolean;
  isRegeneratingKey: boolean;
  onCopyApiKey: (text: string) => void;
  onRegenerateKey: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  personalKey,
  isRegeneratingKey,
  onRegenerateKey,
}) => {
  const displayName = user?.name || "User";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  const role = ((user as unknown as Record<string, string>)?.role) || "Member";

  return (
    <div className="space-y-4 font-sans">
      <Card>
        <CardHeader
          title="Personal Account Details"
          description="View and manage your account credentials and personal preferences."
        />
        <div className="flex items-center gap-4 p-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(user?.email || user?.name)}`}>
            {initials}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="m-0 truncate text-[15px] font-semibold text-slate-900">{displayName}</h4>
              <Badge tone="neutral">{role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}</Badge>
            </div>
            <p className="m-0 truncate text-[13px] text-slate-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Personal API key"
          description="One key with your full access, for scripts and tools that act as you. Prefer scoped agent keys for anything else."
        />
        <div className="space-y-3 p-4">
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <KeyRound className="h-4 w-4 text-slate-400" /> Personal API key
          </label>
          {personalKey ? (
            <div className="space-y-1.5">
              <SecretReveal value={personalKey} />
              <p className="m-0 text-xs text-amber-700">Copy it now. Keys are stored hashed and cannot be shown again.</p>
            </div>
          ) : (
            <p className="m-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
              Keys are stored hashed, so they cannot be shown again. If you lost yours, create a new one. Existing legacy Sync keys keep
              working until you do, and are flagged as high risk in Agent Governance.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
          <Link className={buttonClass("ghost", "sm")} to="/agents/inventory">
            <ShieldHalf className="h-3.5 w-3.5" /> Manage all agent keys
          </Link>
          <Button size="sm" onClick={onRegenerateKey} disabled={isRegeneratingKey}>
            <RefreshCcw className={`h-3.5 w-3.5 ${isRegeneratingKey ? "animate-spin" : ""}`} />
            <span>{isRegeneratingKey ? "Creating..." : "Create new personal key"}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
