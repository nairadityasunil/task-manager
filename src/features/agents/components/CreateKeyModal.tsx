import { useEffect, useState } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';

import Modal from '@/components/Modal';
import { Button, Field, cn, inputClass, selectClass } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { API_BASE_URL } from '@/services/api';
import { agentsApi, SCOPE_LABELS, type Agent } from '@/services/agents';
import { getProjects } from '@/services/projects';
import type { Project } from '@/types/project';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { SecretReveal } from './shared';

export const STANDARD_SCOPES = [
  'work:read',
  'work:write',
  'collaboration:read',
  'collaboration:write',
  'analytics:read',
  'ai:execute',
  'prompt:read',
  'prompt:write'
];

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: 'never', label: 'Never (not recommended)' }
];

export function ScopePicker({
  value,
  onChange,
  canAdmin
}: {
  value: string[];
  onChange: (scopes: string[]) => void;
  canAdmin: boolean;
}): JSX.Element {
  const scopes = canAdmin ? [...STANDARD_SCOPES, 'workspace:admin'] : STANDARD_SCOPES;
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {scopes.map((scope) => {
        const checked = value.includes(scope);
        const locked = scope === 'work:read';
        return (
          <label
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors',
              checked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
            )}
            key={scope}
          >
            <input
              checked={checked}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
              disabled={locked}
              onChange={(event) =>
                onChange(event.target.checked ? [...value, scope] : value.filter((item) => item !== scope))
              }
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-slate-900">{SCOPE_LABELS[scope]?.label ?? scope}</span>
              <span className="block text-xs text-slate-500">{SCOPE_LABELS[scope]?.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function ProjectPicker({
  projects,
  value,
  onChange
}: {
  projects: Project[];
  value: string[];
  onChange: (ids: string[]) => void;
}): JSX.Element {
  const all = value.length === 0;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          className={cn(
            'h-8 rounded-lg border px-2.5 text-[13px] font-medium transition-colors',
            all ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          )}
          onClick={() => onChange([])}
          type="button"
        >
          All my projects
        </button>
        <button
          className={cn(
            'h-8 rounded-lg border px-2.5 text-[13px] font-medium transition-colors',
            !all ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          )}
          onClick={() => onChange(projects.slice(0, 1).map((p) => p.id))}
          type="button"
        >
          Only selected projects
        </button>
      </div>
      {!all ? (
        <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
          {projects.length === 0 ? <p className="m-0 p-1 text-xs text-slate-500">No projects yet.</p> : null}
          {projects.map((project) => (
            <label className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-slate-700 hover:bg-slate-50" key={project.id}>
              <input
                checked={value.includes(project.id)}
                className="h-4 w-4 accent-emerald-600"
                onChange={(event) =>
                  onChange(event.target.checked ? [...value, project.id] : value.filter((id) => id !== project.id))
                }
                type="checkbox"
              />
              <span className="truncate">{project.name}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface CreateKeyModalProps {
  onClose: () => void;
  onCreated: (agent: Agent) => void;
  /** Loaded on demand when not given. */
  projects?: Project[];
  canAdmin: boolean;
  workspaceId?: string | null;
  /** Preset for where the key will be used, e.g. "Claude Desktop". */
  defaultName?: string;
  /** Receives the new secret, e.g. to fill in configuration snippets. */
  onKey?: (key: string) => void;
}

export function CreateKeyModal({ onClose, onCreated, projects: givenProjects, canAdmin, workspaceId, defaultName = '', onKey }: CreateKeyModalProps): JSX.Element {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>(givenProjects ?? []);
  useEffect(() => {
    if (givenProjects) return;
    getProjects({ limit: 100 })
      .then((page) => setProjects(page.projects))
      .catch(() => undefined);
  }, [givenProjects]);
  const [name, setName] = useState(defaultName);
  const [scopes, setScopes] = useState<string[]>(['work:read', 'work:write', 'collaboration:read', 'analytics:read', 'prompt:read']);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [expiry, setExpiry] = useState('90');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ agent: Agent; key: string } | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const expiresAt = expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 86400000).toISOString();
      const result = await agentsApi.createKey({ name: name.trim(), scopes, projectIds, expiresAt, workspaceId });
      setCreated(result);
      onCreated(result.agent);
      onKey?.(result.key);
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <Modal
        description="This is the only time the key is shown. Store it in your client or a secret manager."
        footer={
          <Button onClick={onClose} variant="primary">
            Done
          </Button>
        }
        onClose={onClose}
        title={`Key created for ${created.agent.name}`}
      >
        <div className="space-y-4">
          <SecretReveal value={created.key} />
          <div className="space-y-1.5">
            <p className="m-0 text-[13px] font-medium text-slate-700">Use it as a bearer token</p>
            <pre className="m-0 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
              {`curl ${API_BASE_URL}/mcp/tools \\\n  -H "Authorization: Bearer ${created.key.slice(0, 14)}…"`}
            </pre>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      description="Give each tool or integration its own key, with only the access it needs."
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!name.trim()} icon={KeyRound} loading={saving} onClick={() => void submit()} variant="primary">
            Create key
          </Button>
        </>
      }
      maxWidth="max-w-[640px]"
      onClose={onClose}
      title="New agent key"
    >
      <div className="space-y-4">
        <Field hint="Where the key will be used, e.g. Claude Desktop or Nightly sync." label="Name">
          <input autoFocus className={inputClass} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Claude Desktop" value={name} />
        </Field>
        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium text-slate-700">What it can do</span>
          <ScopePicker canAdmin={canAdmin} onChange={setScopes} value={scopes} />
        </div>
        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium text-slate-700">Where it can make changes</span>
          <ProjectPicker onChange={setProjectIds} projects={projects} value={projectIds} />
        </div>
        <Field label="Expires after">
          <select className={selectClass} onChange={(e) => setExpiry(e.target.value)} value={expiry}>
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {expiry === 'never' || projectIds.length === 0 ? (
          <p className="m-0 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
            Keys that never expire or reach every project raise the agent&apos;s risk score.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
