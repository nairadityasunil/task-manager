import React, { useState } from 'react';
import { buttonClass, inputClass } from '@/components/ui';
import { Building2, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface CreateWorkspaceDialogProps {
  onClose: () => void;
}

export function CreateWorkspaceDialog({ onClose }: CreateWorkspaceDialogProps): JSX.Element {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deriveSlug = (n: string) =>
    n.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 60);

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(deriveSlug(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createWorkspace(name.trim(), slug || undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
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
              <Building2 className="h-[18px] w-[18px] text-slate-600" />
            </div>
            <h3 className="m-0 text-base font-semibold text-slate-900">Create New Workspace</h3>
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
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Product Team"
              className={inputClass}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug <span className="font-normal text-slate-400">(auto-generated)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(deriveSlug(e.target.value))}
              placeholder="acme-product-team"
              className={`${inputClass} font-mono text-[13px]`}
            />
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
              disabled={loading || !name.trim()}
              className={buttonClass('primary')}
            >
              {loading ? 'Creating…' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateWorkspaceDialog;
