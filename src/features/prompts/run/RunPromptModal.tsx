import { ArrowLeft, CheckCircle2, ListPlus, Play, Search, Sparkles, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Modal from '@/components/Modal';
import { Badge, Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import {
  promptService,
  type PlaygroundRunResult,
  type RunnablePrompt,
} from '@/services/prompts';
import { createTask } from '@/services/tasks';
import type { Epic } from '@/types/epic';
import type { TaskPriority } from '@/types/task';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { parseTasks, singleTask } from './parseTasks';

interface Props {
  workspaceId: string;
  projectId: string;
  projectName: string;
  epics: Epic[];
  onClose: () => void;
  /** Called after tasks were created, so the project's task list can reload. */
  onTasksCreated: () => void;
}

type Step = 'browse' | 'variables' | 'result';

/**
 * Run a prompt from a project: pick one that is deployed, fill in its {{variables}}, run the version in
 * production (a canary share of runs goes to the candidate), then turn the answer into tasks in this project.
 */
export function RunPromptModal({ workspaceId, projectId, projectName, epics, onClose, onTasksCreated }: Props): JSX.Element {
  const [step, setStep] = useState<Step>('browse');
  const [prompts, setPrompts] = useState<RunnablePrompt[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [selected, setSelected] = useState<RunnablePrompt | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaygroundRunResult | null>(null);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [titles, setTitles] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [epicId, setEpicId] = useState('');
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setPrompts(null);
    promptService
      .listRunnable(workspaceId, { projectId, search: q.trim() || undefined })
      .then((list) => !cancelled && setPrompts(list))
      .catch((e) => {
        if (!cancelled) {
          setLoadError(toDisplayErrorMessage(e));
          setPrompts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, projectId, q]);

  const tags = useMemo(() => [...new Set((prompts ?? []).flatMap((p) => p.tags))].sort(), [prompts]);
  const shown = (prompts ?? []).filter((p) => !tag || p.tags.includes(tag));

  const choose = (p: RunnablePrompt) => {
    setSelected(p);
    setValues(Object.fromEntries(p.variables.map((v) => [v.name, v.defaultValue ?? ''])));
    setRunError(null);
    setResult(null);
    setStep('variables');
  };

  const missing = selected?.variables.filter((v) => v.required && !(values[v.name] ?? '').trim()) ?? [];

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    setRunError(null);
    try {
      const supplied: Record<string, unknown> = {};
      for (const v of selected.variables) {
        const raw = (values[v.name] ?? '').trim();
        if (raw === '') continue;
        supplied[v.name] = v.type === 'number' ? Number(raw) : v.type === 'boolean' ? raw === 'true' : raw;
      }
      const r = await promptService.runPlayground(workspaceId, {
        promptId: selected.id,
        environment: 'production',
        projectId,
        variables: supplied,
      });
      setResult(r);
      const found = parseTasks(r.output);
      setTitles(found);
      setPicked(Object.fromEntries(found.map((_, i) => [i, true])));
      setStep('result');
    } catch (e) {
      setRunError(toDisplayErrorMessage(e));
    } finally {
      setRunning(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const create = async (items: Array<{ title: string; description?: string }>) => {
    setCreating(true);
    try {
      for (const t of items)
        await createTask({
          title: t.title,
          description: t.description,
          date: today,
          priority,
          source: 'manual',
          projectId,
          epicId: epicId || null,
        });
      showToast({ variant: 'success', message: `${items.length} task${items.length === 1 ? '' : 's'} created in ${projectName}` });
      onTasksCreated();
      onClose();
    } catch (e) {
      setRunError(toDisplayErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const chosen = titles.map((t, i) => ({ t, i })).filter(({ i }) => picked[i] && titles[i].trim());

  return (
    <Modal
      description={step === 'browse' ? 'Prompts that are deployed to production. A run uses the deployed version.' : undefined}
      onClose={onClose}
      panelClassName="max-w-3xl"
      title={step === 'browse' ? 'Run a prompt' : (selected?.name ?? 'Run a prompt')}
    >
      <div className="grid gap-4" data-testid="run-prompt">
        {step === 'browse' ? (
          <>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input aria-label="Search prompts" className="pl-8" onChange={(e) => setQ(e.target.value)} placeholder="Search prompts" value={q} />
              </div>
              {tags.length ? (
                <div className="w-44">
                  <Select
                    aria-label="Filter by tag"
                    onValueChange={setTag}
                    options={[{ value: '', label: 'All tags' }, ...tags.map((t) => ({ value: t, label: t }))]}
                    value={tag}
                  />
                </div>
              ) : null}
            </div>
            {loadError ? <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">{loadError}</p> : null}
            {!prompts ? (
              <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
            ) : !shown.length ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[13px] text-slate-500" data-testid="run-prompt-empty">
                <p className="m-0 font-medium text-slate-700">No deployed prompts{q || tag ? ' match' : ''}</p>
                <p className="m-0 mt-1">Deploy a prompt to production in the Prompt Library or Playground and it will appear here.</p>
              </div>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {shown.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/20"
                      data-testid="run-prompt-row"
                      onClick={() => choose(p)}
                      type="button"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Sparkles aria-hidden className="h-4 w-4 text-violet-500" />
                        <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                        <Badge tone="success">Production v{p.productionVersion}</Badge>
                        {p.canary ? (
                          <Badge tone="info">
                            <Zap aria-hidden className="h-3 w-3" />
                            Canary v{p.canary.candidateVersion} · {p.canary.canaryPercent}%{p.canary.status === 'paused' ? ' (paused)' : ''}
                          </Badge>
                        ) : null}
                        {p.variables.length ? <Badge tone="neutral">{p.variables.length} variable{p.variables.length === 1 ? '' : 's'}</Badge> : null}
                      </span>
                      {p.description ? <span className="text-[13px] text-slate-600">{p.description}</span> : null}
                      {p.tags.length ? (
                        <span className="flex flex-wrap gap-1">
                          {p.tags.map((t) => (
                            <Badge key={t} tone="neutral">{t}</Badge>
                          ))}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        {step === 'variables' && selected ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
              <Badge tone="success">Production v{selected.productionVersion}</Badge>
              {selected.canary ? (
                <span>
                  A canary of v{selected.canary.candidateVersion} is {selected.canary.status}: about {selected.canary.canaryPercent}% of runs use it.
                </span>
              ) : null}
            </div>
            {selected.variables.length ? (
              <div className="grid gap-3" data-testid="run-prompt-variables">
                <p className="m-0 text-[13px] text-slate-600">This prompt asks for {selected.variables.length === 1 ? 'a value' : 'some values'} ({'{{ }}'} in the prompt).</p>
                {selected.variables.map((v) => (
                  <Field hint={v.description || undefined} key={v.name} label={`${v.name}${v.required ? ' *' : ''}`}>
                    {v.type === 'enum' && v.options.length ? (
                      <Select
                        onValueChange={(val) => setValues((s) => ({ ...s, [v.name]: val }))}
                        options={[{ value: '', label: 'Choose' }, ...v.options.map((o) => ({ value: o, label: o }))]}
                        value={values[v.name] ?? ''}
                      />
                    ) : v.type === 'boolean' ? (
                      <Select
                        onValueChange={(val) => setValues((s) => ({ ...s, [v.name]: val }))}
                        options={[{ value: '', label: 'Not set' }, { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                        value={values[v.name] ?? ''}
                      />
                    ) : v.type === 'json' || v.name.length > 0 ? (
                      v.type === 'number' ? (
                        <Input onChange={(e) => setValues((s) => ({ ...s, [v.name]: e.target.value }))} type="number" value={values[v.name] ?? ''} />
                      ) : (
                        <Textarea onChange={(e) => setValues((s) => ({ ...s, [v.name]: e.target.value }))} rows={v.type === 'json' ? 4 : 2} value={values[v.name] ?? ''} />
                      )
                    ) : null}
                  </Field>
                ))}
              </div>
            ) : (
              <p className="m-0 text-[13px] text-slate-600">This prompt has no variables. It runs as it is.</p>
            )}
            {runError ? <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">{runError}</p> : null}
            <div className="flex justify-between gap-2">
              <Button icon={ArrowLeft} onClick={() => setStep('browse')}>Back</Button>
              <Button disabled={running || missing.length > 0} icon={Play} onClick={() => void run()} variant="primary">
                {running ? 'Running' : 'Run'}
              </Button>
            </div>
            {missing.length ? <p className="m-0 text-xs text-slate-500">Still needed: {missing.map((m) => m.name).join(', ')}</p> : null}
          </>
        ) : null}

        {step === 'result' && result ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600" data-testid="run-prompt-meta">
              <Badge tone={result.metadata.isCanary ? 'info' : 'success'}>
                {result.metadata.isCanary ? <Zap aria-hidden className="h-3 w-3" /> : <CheckCircle2 aria-hidden className="h-3 w-3" />}
                {result.metadata.isCanary ? 'Canary' : 'Production'} v{result.metadata.versionNumber}
              </Badge>
              <span>{result.metadata.provider} · {result.metadata.modelName}</span>
              <span>{result.metadata.latencyMs} ms</span>
              {result.metadata.totalTokens ? <span>{result.metadata.totalTokens} tokens</span> : null}
            </div>
            <pre className="m-0 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-800" data-testid="run-prompt-output">{result.output}</pre>

            <section className="grid gap-3 rounded-lg border border-slate-200 p-3" data-testid="run-prompt-tasks">
              <h3 className="m-0 flex items-center gap-2 text-[13px] font-semibold text-slate-900"><ListPlus aria-hidden className="h-4 w-4" /> Create tasks from this answer</h3>
              {titles.length ? (
                <ul className="m-0 grid list-none gap-1.5 p-0">
                  {titles.map((t, i) => (
                    <li className="flex items-center gap-2" key={i}>
                      <Checkbox aria-label={`Include task ${i + 1}`} checked={!!picked[i]} onChange={() => setPicked((s) => ({ ...s, [i]: !s[i] }))} />
                      <Input aria-label={`Task ${i + 1} title`} onChange={(e) => setTitles((a) => a.map((x, j) => (j === i ? e.target.value : x)))} value={t} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[13px] text-slate-600">No list of steps was found in the answer. You can still make one task from it.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Priority">
                  <Select
                    onValueChange={(v) => setPriority(v as TaskPriority)}
                    options={[{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }, { value: 'CRITICAL', label: 'Critical' }]}
                    value={priority}
                  />
                </Field>
                <Field label="Epic (optional)">
                  <Select
                    onValueChange={setEpicId}
                    options={[{ value: '', label: 'No epic' }, ...epics.map((e) => ({ value: e.id, label: e.name }))]}
                    value={epicId}
                  />
                </Field>
              </div>
              {runError ? <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800" role="alert">{runError}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                {titles.length ? (
                  <Button disabled={creating || !chosen.length} onClick={() => void create(chosen.map(({ t }) => ({ title: t.trim() })))} variant="primary">
                    {creating ? 'Creating' : `Create ${chosen.length} task${chosen.length === 1 ? '' : 's'}`}
                  </Button>
                ) : (
                  <Button disabled={creating} onClick={() => void create([singleTask(result.output)])} variant="primary">
                    {creating ? 'Creating' : 'Create one task from the answer'}
                  </Button>
                )}
              </div>
            </section>
            <div className="flex justify-between gap-2">
              <Button icon={ArrowLeft} onClick={() => setStep('variables')}>Change values</Button>
              <Button onClick={() => setStep('browse')}>Another prompt</Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
