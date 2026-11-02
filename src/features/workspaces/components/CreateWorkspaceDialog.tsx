import React, { useState } from 'react';
import Modal from '@/components/Modal';
import { buttonClass, inputClass, Input } from '@/components/ui';
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
    <Modal maxWidth="max-w-md" onClose={onClose} title="Create New Workspace">
      <div>
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
            <Input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Product Team"
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
    </Modal>
  );
}

export default CreateWorkspaceDialog;
