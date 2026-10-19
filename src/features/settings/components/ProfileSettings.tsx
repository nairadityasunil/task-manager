import React from "react";
import { UserCircle, KeyRound, Copy, Check, Eye, EyeOff, RefreshCcw } from "lucide-react";
import type { AuthProfile } from "@/store/authSlice";
import SectionCard from "@/components/SectionCard";

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

  return (
    <div className="space-y-6 font-sans">
      <SectionCard>
        <h3 className="text-sm font-semibold text-slate-950 mb-1">Personal Account Details</h3>
        <p className="text-xs text-slate-600 mb-4">View and manage your account credentials and personal preferences.</p>
        <div className="space-y-4 text-xs">
          <div className="flex items-center gap-4 p-4 rounded border border-slate-200 bg-slate-50/50">
            <div className="p-2.5 rounded-full bg-slate-200/80 text-slate-800">
              <UserCircle className="w-7 h-7" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="font-semibold text-slate-950 text-sm">{user?.name || "User"}</h4>
              <p className="text-slate-600 font-mono text-[11px] truncate">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-200 text-slate-900 border border-slate-300">
                {((user as unknown as Record<string, string>)?.role) || "Member"}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className="text-sm font-semibold text-slate-950 mb-1">Sync API Key (ChatGPT & External Tools)</h3>
        <p className="text-xs text-slate-600 mb-4">Your personal API key used to authenticate ChatGPT actions and third-party integrations.</p>
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded bg-slate-950 text-slate-100 border border-slate-900 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> Personal API Key
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onCopyApiKey(syncApiKey)}
                  className="p-1 rounded text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                  title="Copy API Key"
                >
                  {apiKeyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded text-emerald-400 font-semibold border border-slate-800 truncate select-all">
              {showKey ? syncApiKey : "sync_ak_" + "•".repeat(32)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-600 text-[11px]">
              Keep this key confidential. It provides authenticated API access to your account.
            </span>
            <button
              type="button"
              onClick={onRegenerateKey}
              disabled={isRegeneratingKey}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs rounded transition border border-slate-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isRegeneratingKey ? "animate-spin" : ""}`} />
              <span>{isRegeneratingKey ? "Regenerating..." : "Regenerate Key"}</span>
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
