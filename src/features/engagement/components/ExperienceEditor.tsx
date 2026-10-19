import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  Crosshair,
  Lightbulb,
  ListChecks,
  Map as MapIcon,
  Megaphone,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { GuideStep, GuideType, SurveyQuestionType } from '@/lib/guides/types';
import { Button, cn, inputClass, selectClass, textareaClass } from '@/components/ui';

export type EditorKind = 'guide' | 'survey' | 'checklist';

/** Centered dialog with a fixed header and footer and a scrolling body; full width (with a small margin) on phones. */
export function EditorDialog({
  title,
  description,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-6xl',
  closeLabel = 'Close',
  bodyClassName
}: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  closeLabel?: string;
  bodyClassName?: string;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5">
      <div aria-modal="true" className={cn('flex max-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-40px)]', maxWidth)} role="dialog">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="m-0 mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
          <button
            aria-label={closeLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6', bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6">{footer}</div>
        )}
      </div>
    </div>
  );
}

const newId = (): string => crypto.randomUUID();

// ─── Guide types ────────────────────────────────────────────────────────────

export const GUIDE_TYPE_INFO: Record<
  Exclude<GuideType, 'SURVEY' | 'CHECKLIST'>,
  { label: string; description: string; icon: LucideIcon; selector: 'none' | 'optional' | 'required'; multiStep: boolean }
> = {
  MODAL: { label: 'Modal', description: 'A centred dialog. Great for welcomes and announcements.', icon: AppWindow, selector: 'none', multiStep: true },
  TOUR: { label: 'Product tour', description: 'Step-by-step tooltips that point at parts of your app.', icon: MapIcon, selector: 'optional', multiStep: true },
  SMART_TIP: { label: 'Smart tip', description: 'A small tip pinned next to one element.', icon: Lightbulb, selector: 'required', multiStep: false },
  HOTSPOT: { label: 'Hotspot', description: 'A pulsing dot that opens a tip when clicked.', icon: Crosshair, selector: 'required', multiStep: false },
  BANNER: { label: 'Banner', description: 'A bar across the top of the page.', icon: Megaphone, selector: 'none', multiStep: false }
};

export function GuideTypePicker({ value, onChange }: { value: GuideType; onChange: (type: GuideType) => void }): JSX.Element {
  return (
    <div>
      <p className="m-0 mb-2 text-sm font-medium text-slate-700">Format</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Guide format">
        {(Object.keys(GUIDE_TYPE_INFO) as Array<keyof typeof GUIDE_TYPE_INFO>).map((type) => {
          const info = GUIDE_TYPE_INFO[type];
          const Icon = info.icon;
          const active = value === type;
          return (
            <button
              aria-checked={active}
              className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 ${
                active ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
              key={type}
              onClick={() => onChange(type)}
              role="radio"
              type="button"
            >
              <Icon size={16} className={active ? 'text-slate-900' : 'text-slate-400'} />
              <span className="text-sm font-medium">{info.label}</span>
              <span className="text-xs leading-snug text-slate-500">{info.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Survey question types ──────────────────────────────────────────────────

const QUESTION_TYPES: Array<{ type: SurveyQuestionType; label: string; group: string; hint: string }> = [
  { type: 'NPS', label: 'Net Promoter Score (0–10)', group: 'Scores', hint: 'How likely users are to recommend you. Feeds the NPS chart.' },
  { type: 'CSAT', label: 'Satisfaction (1–5)', group: 'Scores', hint: 'How satisfied users are with something specific.' },
  { type: 'CES', label: 'Effort (1–7)', group: 'Scores', hint: 'How easy it was to get something done.' },
  { type: 'RATING_SCALE', label: 'Star rating (1–5)', group: 'Scores', hint: 'Five stars.' },
  { type: 'OPINION_SCALE', label: 'Opinion scale', group: 'Scores', hint: 'A numbered scale between the minimum and maximum you set (up to 11 points).' },
  { type: 'EMOJI', label: 'Emoji reaction', group: 'Scores', hint: 'Four faces from unhappy to delighted.' },
  { type: 'YES_NO', label: 'Yes / No', group: 'Choices', hint: 'Two buttons.' },
  { type: 'SINGLE_CHOICE', label: 'Single choice', group: 'Choices', hint: 'Pick one option.' },
  { type: 'MULTI_CHOICE', label: 'Multiple choice', group: 'Choices', hint: 'Pick any number of options.' },
  { type: 'DROPDOWN', label: 'Dropdown', group: 'Choices', hint: 'Pick one option from a menu. Good for long lists.' },
  { type: 'TEXT', label: 'Short answer', group: 'Text', hint: 'One line of text.' },
  { type: 'TEXTAREA', label: 'Long answer', group: 'Text', hint: 'A paragraph of text.' },
  { type: 'CONTACT', label: 'Email address', group: 'Text', hint: 'Checked to be a valid email.' },
  { type: 'FILE_UPLOAD', label: 'File link', group: 'Text', hint: 'Users paste a link (Drive, Dropbox…). Files are not uploaded.' }
];

const CHOICE_TYPES = new Set<SurveyQuestionType | undefined>(['SINGLE_CHOICE', 'MULTI_CHOICE', 'DROPDOWN']);

export const questionTypeLabel = (type?: SurveyQuestionType): string =>
  QUESTION_TYPES.find((entry) => entry.type === type)?.label ?? 'Long answer';

// ─── Factories ──────────────────────────────────────────────────────────────

export const newGuideStep = (title = 'New step', description = ''): GuideStep => ({ id: newId(), title, description, placement: 'AUTO', selector: '' });

export const newQuestion = (type: SurveyQuestionType = 'SINGLE_CHOICE', title = 'New question'): GuideStep => ({
  id: newId(),
  title,
  type,
  required: false,
  min: type === 'OPINION_SCALE' ? 1 : 0,
  max: type === 'OPINION_SCALE' ? 5 : 10,
  options: CHOICE_TYPES.has(type) ? ['Option 1', 'Option 2'] : []
});

export const newChecklistItem = (title = 'New task', linkedEvent = ''): GuideStep => ({ id: newId(), title, description: '', linkedEvent, estimatedMinutes: 2 });

// ─── Templates ──────────────────────────────────────────────────────────────

export interface ExperienceTemplate {
  key: string;
  name: string;
  summary: string;
  title: string;
  description: string;
  guideType?: GuideType;
  build: () => GuideStep[];
}

export const TEMPLATES: Record<EditorKind, ExperienceTemplate[]> = {
  guide: [
    {
      key: 'welcome',
      name: 'Welcome message',
      summary: 'Greet new users and point them to the first step.',
      title: 'Welcome aboard',
      description: 'Shown to new users on their first visit.',
      guideType: 'MODAL',
      build: () => [
        newGuideStep('Welcome to the app 👋', 'Here is a quick look at what you can do.'),
        newGuideStep('Start your first project', 'Create a project to organise your work.')
      ]
    },
    {
      key: 'tour',
      name: 'Product tour',
      summary: 'Walk users through the main areas of a page.',
      title: 'Dashboard tour',
      description: 'A short walkthrough of the dashboard.',
      guideType: 'TOUR',
      build: () => [
        newGuideStep('Welcome to your dashboard', 'Let us show you around. This takes 30 seconds.'),
        { ...newGuideStep('Navigation', 'Switch between areas of the app here.'), selector: 'nav' },
        newGuideStep('You are all set', 'Come back to this tour any time from Help.')
      ]
    },
    {
      key: 'announcement',
      name: 'Feature announcement',
      summary: 'A banner that announces something new.',
      title: 'New feature announcement',
      description: 'Lets users know about a new feature.',
      guideType: 'BANNER',
      build: () => [newGuideStep('New: smarter search', 'Find anything in your workspace in seconds.')]
    },
    {
      key: 'tip',
      name: 'Feature tip',
      summary: 'A tip pinned next to a button users miss.',
      title: 'Feature tip',
      description: 'Highlights a useful but easy-to-miss feature.',
      guideType: 'SMART_TIP',
      build: () => [newGuideStep('Did you know?', 'You can export any report from here.')]
    }
  ],
  survey: [
    {
      key: 'nps',
      name: 'NPS',
      summary: 'Measure loyalty with the 0–10 recommend question.',
      title: 'NPS survey',
      description: 'Quarterly loyalty check.',
      build: () => [
        { ...newQuestion('NPS', 'How likely are you to recommend us to a friend or colleague?'), required: true },
        newQuestion('TEXTAREA', 'What is the main reason for your score?')
      ]
    },
    {
      key: 'csat',
      name: 'Satisfaction (CSAT)',
      summary: 'Ask how satisfied users are after a key action.',
      title: 'Satisfaction check',
      description: 'Shown after a user completes a key action.',
      build: () => [
        { ...newQuestion('CSAT', 'How satisfied are you with this feature?'), required: true },
        newQuestion('TEXT', 'What could we do better?')
      ]
    },
    {
      key: 'feature',
      name: 'Feature feedback',
      summary: 'Learn which features people use and want.',
      title: 'Feature feedback',
      description: 'Helps prioritise the roadmap.',
      build: () => [
        { ...newQuestion('MULTI_CHOICE', 'Which features do you use most?'), options: ['Projects', 'Tasks', 'Chat', 'Reports'] },
        newQuestion('YES_NO', 'Would you use an AI assistant?'),
        newQuestion('TEXTAREA', 'What should we build next?')
      ]
    },
    {
      key: 'onboarding',
      name: 'Onboarding feedback',
      summary: 'Find friction in the first-run experience.',
      title: 'Onboarding feedback',
      description: 'Shown after the first project is created.',
      build: () => [
        { ...newQuestion('CES', 'How easy was it to get started?'), required: true },
        { ...newQuestion('SINGLE_CHOICE', 'How did you hear about us?'), options: ['Search', 'A friend', 'Social media', 'Other'] }
      ]
    }
  ],
  checklist: [
    {
      key: 'getting-started',
      name: 'Getting started',
      summary: 'Guide new users to their first success.',
      title: 'Getting started',
      description: 'Complete these to get the most out of the app.',
      build: () => [
        newChecklistItem('Create your first project', 'project_created'),
        newChecklistItem('Add a task', 'task_created'),
        newChecklistItem('Invite a teammate', 'invite_sent')
      ]
    }
  ]
};

export function TemplatePicker({ kind, onPick }: { kind: EditorKind; onPick: (template: ExperienceTemplate) => void }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-slate-900">
        <Sparkles size={15} className="text-slate-500" /> Start from a template
      </p>
      <p className="m-0 mt-0.5 text-[13px] text-slate-500">Pick one to fill in the form, then change anything you like.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES[kind].map((template) => (
          <button
            className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10"
            key={template.key}
            onClick={() => onPick(template)}
            type="button"
          >
            <span className="block text-sm font-medium text-slate-900">{template.name}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{template.summary}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Validation ─────────────────────────────────────────────────────────────

export const validateExperience = (kind: EditorKind, guideType: GuideType, title: string, steps: GuideStep[]): string[] => {
  const errors: string[] = [];
  if (!title.trim()) errors.push('Give it a name.');
  const noun = kind === 'survey' ? 'question' : kind === 'checklist' ? 'task' : 'step';
  if (steps.length === 0) errors.push(`Add at least one ${noun}.`);
  steps.forEach((step, index) => {
    const label = `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${index + 1}`;
    if (!step.title?.trim()) errors.push(`${label} needs a title.`);
    if (kind === 'survey' && CHOICE_TYPES.has(step.type) && (step.options ?? []).filter((option) => option.trim()).length < 2) {
      errors.push(`${label} needs at least two options.`);
    }
    if (kind === 'survey' && step.type === 'OPINION_SCALE' && !(Number(step.max) > Number(step.min))) {
      errors.push(`${label}: the maximum must be greater than the minimum.`);
    }
  });
  if (kind === 'guide') {
    const info = GUIDE_TYPE_INFO[guideType as keyof typeof GUIDE_TYPE_INFO];
    if (info?.selector === 'required' && !steps[0]?.selector?.trim()) {
      errors.push(`A ${info.label.toLowerCase()} needs the CSS selector of the element to point at.`);
    }
  }
  return errors;
};

// ─── Content editor ─────────────────────────────────────────────────────────

const inputCls = cn(inputClass, 'min-w-0');
const textareaCls = cn(textareaClass, 'min-w-0');
const labelCls = 'grid gap-1.5 text-sm font-medium text-slate-700';
const hintCls = 'text-xs font-normal text-slate-500';

interface ContentEditorProps {
  kind: EditorKind;
  guideType: GuideType;
  steps: GuideStep[];
  onChange: (steps: GuideStep[]) => void;
}

export function ContentEditor({ kind, guideType, steps, onChange }: ContentEditorProps): JSX.Element {
  const info = kind === 'guide' ? GUIDE_TYPE_INFO[guideType as keyof typeof GUIDE_TYPE_INFO] : undefined;
  const singleStep = kind === 'guide' && info && !info.multiStep;
  const visible = singleStep ? steps.slice(0, 1) : steps;
  const noun = kind === 'survey' ? 'Question' : kind === 'checklist' ? 'Task' : 'Step';
  const heading = kind === 'survey' ? 'Questions' : kind === 'checklist' ? 'Tasks' : singleStep ? 'Content' : 'Steps';

  const update = (index: number, patch: Partial<GuideStep>) => onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  const remove = (index: number) => onChange(steps.filter((_, i) => i !== index));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = () =>
    onChange([...steps, kind === 'survey' ? newQuestion() : kind === 'checklist' ? newChecklistItem() : newGuideStep()]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="m-0 text-sm font-medium text-slate-700">{heading}</p>
        {!singleStep && (
          <Button icon={Plus} onClick={add} size="sm">
            Add {noun.toLowerCase()}
          </Button>
        )}
      </div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {visible.map((step, index) => (
          <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" key={step.id}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {singleStep ? (kind === 'guide' ? info?.label : noun) : `${noun} ${index + 1}`}
              </span>
              {!singleStep && (
                <div className="flex items-center gap-0.5">
                  <IconBtn disabled={index === 0} label="Move up" onClick={() => move(index, -1)}><ArrowUp size={14} /></IconBtn>
                  <IconBtn disabled={index === steps.length - 1} label="Move down" onClick={() => move(index, 1)}><ArrowDown size={14} /></IconBtn>
                  <IconBtn danger disabled={steps.length <= 1} label={`Remove ${noun.toLowerCase()}`} onClick={() => remove(index)}><Trash2 size={14} /></IconBtn>
                </div>
              )}
            </div>
            {kind === 'survey' ? (
              <QuestionFields question={step} onChange={(patch) => update(index, patch)} />
            ) : (
              <div className="grid gap-3">
                <label className={labelCls}>
                  {kind === 'checklist' ? 'Task' : 'Heading'}
                  <input className={inputCls} onChange={(event) => update(index, { title: event.target.value })} value={step.title} />
                </label>
                <label className={labelCls}>
                  {kind === 'checklist' ? 'Details (optional)' : 'Message'}
                  <textarea className={`${textareaCls} resize-y`} onChange={(event) => update(index, { description: event.target.value })} rows={2} value={step.description ?? ''} />
                </label>
                {kind === 'checklist' && (
                  <label className={labelCls}>
                    Completes when this event is tracked
                    <input className={`${inputCls} font-mono`} onChange={(event) => update(index, { linkedEvent: event.target.value.trim() })} placeholder="e.g. project_created" value={step.linkedEvent ?? ''} />
                    <span className={hintCls}>The event name your app sends with tracker.track(…). Leave empty to let users tick it off themselves.</span>
                  </label>
                )}
                {kind === 'guide' && info && info.selector !== 'none' && (
                  <label className={labelCls}>
                    Point at element {info.selector === 'optional' && <span className="font-normal text-slate-500">(optional)</span>}
                    <input className={`${inputCls} font-mono`} onChange={(event) => update(index, { selector: event.target.value })} placeholder="e.g. #save-button or [data-tour='projects']" value={step.selector ?? ''} />
                    <span className={hintCls}>
                      {info.selector === 'optional'
                        ? 'A CSS selector for the element this step points at. Leave empty to show the step in the centre of the screen.'
                        : 'A CSS selector for the element to attach to. Tip: add a data attribute like data-tour="export" to your HTML and use [data-tour="export"].'}
                    </span>
                  </label>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function QuestionFields({ question, onChange }: { question: GuideStep; onChange: (patch: Partial<GuideStep>) => void }): JSX.Element {
  const typeInfo = QUESTION_TYPES.find((entry) => entry.type === question.type);
  const options = question.options ?? [];
  const groups = Array.from(new Set(QUESTION_TYPES.map((entry) => entry.group)));

  const changeType = (type: SurveyQuestionType) => {
    const patch: Partial<GuideStep> = { type };
    if (CHOICE_TYPES.has(type) && options.length < 2) patch.options = ['Option 1', 'Option 2'];
    if (type === 'OPINION_SCALE') {
      patch.min = 1;
      patch.max = 5;
    }
    onChange(patch);
  };

  return (
    <div className="grid gap-3">
      <label className={labelCls}>
        Question
        <input className={inputCls} onChange={(event) => onChange({ title: event.target.value })} value={question.title} />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className={labelCls}>
          Answer type
          <select className={cn(selectClass, 'min-w-0')} onChange={(event) => changeType(event.target.value as SurveyQuestionType)} value={question.type ?? 'TEXTAREA'}>
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {QUESTION_TYPES.filter((entry) => entry.group === group).map((entry) => (
                  <option key={entry.type} value={entry.type}>{entry.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 self-end text-sm text-slate-700">
          <input checked={Boolean(question.required)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" onChange={(event) => onChange({ required: event.target.checked })} type="checkbox" />
          Required
        </label>
      </div>
      {typeInfo && <p className="m-0 -mt-1 text-xs text-slate-500">{typeInfo.hint}</p>}
      <label className={labelCls}>
        Help text (optional)
        <input className={inputCls} onChange={(event) => onChange({ description: event.target.value })} value={question.description ?? ''} />
      </label>

      {CHOICE_TYPES.has(question.type) && (
        <div className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Options</span>
          {options.map((option, optionIndex) => (
            <div className="flex items-center gap-2" key={optionIndex}>
              <input
                aria-label={`Option ${optionIndex + 1}`}
                className={inputCls}
                onChange={(event) => onChange({ options: options.map((value, i) => (i === optionIndex ? event.target.value : value)) })}
                value={option}
              />
              <IconBtn danger disabled={options.length <= 2} label={`Remove option ${optionIndex + 1}`} onClick={() => onChange({ options: options.filter((_, i) => i !== optionIndex) })}>
                <X size={14} />
              </IconBtn>
            </div>
          ))}
          <button
            className="flex h-8 w-fit items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => onChange({ options: [...options, `Option ${options.length + 1}`] })}
            type="button"
          >
            <Plus size={13} /> Add option
          </button>
        </div>
      )}

      {question.type === 'OPINION_SCALE' && (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            From
            <input className={inputCls} max={10} min={0} onChange={(event) => onChange({ min: Number(event.target.value) })} type="number" value={question.min ?? 1} />
          </label>
          <label className={labelCls}>
            To
            <input className={inputCls} max={20} min={1} onChange={(event) => onChange({ max: Number(event.target.value) })} type="number" value={question.max ?? 5} />
          </label>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger = false
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}): JSX.Element {
  return (
    <button
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 disabled:opacity-30 ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700'}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export const kindIcon: Record<EditorKind, LucideIcon> = { guide: MapIcon, survey: MessageSquareText, checklist: ListChecks };
