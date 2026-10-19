import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { workspaceService } from '../services/workspaceService';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Workspace, WorkspaceRole } from '../types/workspace';
import { isAtLeastAdmin } from '../types/workspace';
import { Button, Field, inputClass, selectClass } from '@/components/ui';

interface WorkspaceGeneralSettingsProps {
  workspace: Workspace;
}

export function WorkspaceGeneralSettings({ workspace }: WorkspaceGeneralSettingsProps): JSX.Element {
  const { refreshWorkspaces } = useWorkspace();
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [defaultRole, setDefaultRole] = useState<WorkspaceRole>('MEMBER');
  const [allowGuests, setAllowGuests] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canEdit = isAtLeastAdmin(workspace.role);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await workspaceService.updateWorkspace(workspace.id, {
        name: name.trim(),
        slug: slug.trim(),
        settings: { defaultProjectRole: defaultRole, allowGuestInvites: allowGuests },
      });
      await refreshWorkspaces();
      setSuccess('Workspace settings saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Workspace Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className={inputClass}
          />
        </Field>
        <Field label="Slug">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^\w-]/g, ''))}
            disabled={!canEdit}
            className={`${inputClass} font-mono text-[13px]`}
          />
        </Field>
      </div>

      <Field label="Default Project Role for New Members" className="sm:max-w-xs">
        <select
          value={defaultRole}
          onChange={(e) => setDefaultRole(e.target.value as WorkspaceRole)}
          disabled={!canEdit}
          className={selectClass}
        >
          {['ADMIN', 'MANAGER', 'MEMBER', 'GUEST'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3.5">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900">Allow Guest Invites</div>
          <div className="mt-0.5 text-[13px] text-slate-500">Let admins invite users with limited guest access</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowGuests}
          aria-label="Allow Guest Invites"
          onClick={() => setAllowGuests((v) => !v)}
          disabled={!canEdit}
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/15 disabled:opacity-50 ${
            allowGuests ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              allowGuests ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {canEdit && (
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button type="submit" variant="primary" icon={Save} loading={isSaving}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
}

export default WorkspaceGeneralSettings;
