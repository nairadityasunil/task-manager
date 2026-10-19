import React, { useState } from 'react';
import { buttonClass, inputClass, selectClass } from '@/components/ui';
import { UserPlus, X } from 'lucide-react';
import type { WorkspaceRole } from '../types/workspace';

interface InviteMemberDialogProps {
  workspaceName: string;
  onClose: () => void;
  onInvite: (email: string, role: WorkspaceRole) => Promise<void>;
}

const ROLES: WorkspaceRole[] = ['ADMIN', 'MANAGER', 'MEMBER', 'GUEST'];

export function InviteMemberDialog({
  workspaceName,
  onClose,
  onInvite,
}: InviteMemberDialogProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onInvite(email.trim().toLowerCase(), role);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm animate-in fade-in duration-150 sm:p-5" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
              <UserPlus className="h-[18px] w-[18px] text-slate-600" />
            </div>
            <div>
              <h3 className="m-0 text-base font-semibold text-slate-900">Invite Member</h3>
              <p className="m-0 text-[13px] text-slate-500">{workspaceName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className={inputClass}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className={selectClass}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={buttonClass('secondary')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={buttonClass('primary')}
            >
              {loading ? 'Sending…' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteMemberDialog;
