import type { TaskSource } from '@/types/task';

interface SourceBadgeProps {
  source?: TaskSource;
}

const sourceClasses: Record<string, string> = {
  manual:  'bg-slate-50 text-slate-600 ring-slate-200',
  chatgpt: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  claude:  'bg-amber-50 text-amber-700 ring-amber-200',
  gemini:  'bg-sky-50 text-sky-700 ring-sky-200'
};

function SourceBadge({ source = 'manual' }: SourceBadgeProps): JSX.Element {
  const cls = sourceClasses[source] ?? sourceClasses.manual;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      {source}
    </span>
  );
}

export default SourceBadge;