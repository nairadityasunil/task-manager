import React from "react";
import { KeyRound, Copy, Check, Eye, EyeOff, RefreshCcw } from "lucide-react";
import type { AuthProfile } from "@/store/authSlice";
import { Badge, Button, Card, CardHeader, avatarColor } from "@/components/ui";

interface ProfileSettingsProps {
  user: AuthProfile | null;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  apiKeyCopied: boolean;
  isRegeneratingKey: boolean;
  onCopyApiKey: (text: string) => void;
  onRegenerateKey: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  showKey,
  setShowKey,
  apiKeyCopied,
  isRegeneratingKey,
  onCopyApiKey,
  onRegenerateKey,
}) => {
  const syncApiKey = user?.syncApiKey || "No API Key Generated";
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
          title="Sync API Key (ChatGPT & External Tools)"
          description="Your personal API key used to authenticate ChatGPT actions and third-party integrations."
        />
        <div className="space-y-3 p-4">
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <KeyRound className="h-4 w-4 text-slate-400" /> Personal API Key
          </label>
          <div className="flex items-center gap-2">
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-[13px] text-slate-800">
              <span className="truncate select-all">{showKey ? syncApiKey : "sync_ak_" + "•".repeat(32)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Hide key" : "Show key"}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="icon" onClick={() => onCopyApiKey(syncApiKey)} title="Copy API Key" aria-label="Copy API Key">
                {apiKeyCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
          <span className="text-[13px] text-slate-500">
            Keep this key confidential. It provides authenticated API access to your account.
          </span>
          <Button size="sm" onClick={onRegenerateKey} disabled={isRegeneratingKey}>
            <RefreshCcw className={`h-3.5 w-3.5 ${isRegeneratingKey ? "animate-spin" : ""}`} />
            <span>{isRegeneratingKey ? "Regenerating..." : "Regenerate Key"}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
