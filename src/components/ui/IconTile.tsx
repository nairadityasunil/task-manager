import type { LucideIcon } from 'lucide-react';

import { cn } from './cn';

/** Tints used for icon tiles. Each product area has one (see AREA_TONES). */
export type TileTone = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'indigo' | 'teal' | 'orange' | 'slate';

export const TILE_TONES: Record<TileTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  teal: 'bg-teal-50 text-teal-600 ring-teal-100',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200'
};

/** One colour per product area, used for page headers, nav icons and tiles. */
export const AREA_TONES = {
  projects: 'sky',
  tasks: 'emerald',
  ai: 'violet',
  prompts: 'indigo',
  engagement: 'amber',
  events: 'rose',
  integrations: 'teal',
  docs: 'orange',
  settings: 'slate'
} as const satisfies Record<string, TileTone>;

export type Area = keyof typeof AREA_TONES;

/** Text colour for an area's icon, e.g. in the sidebar on hover. */
export const AREA_ICON_TEXT: Record<TileTone, string> = {
  emerald: 'text-emerald-600',
  sky: 'text-sky-600',
  violet: 'text-violet-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  indigo: 'text-indigo-600',
  teal: 'text-teal-600',
  orange: 'text-orange-600',
  slate: 'text-slate-600'
};

const SIZES = {
  sm: { box: 'h-7 w-7 rounded-md', icon: 14 },
  md: { box: 'h-8 w-8 rounded-lg', icon: 16 },
  lg: { box: 'h-10 w-10 rounded-xl', icon: 18 }
} as const;

interface IconTileProps {
  icon: LucideIcon;
  tone?: TileTone;
  size?: keyof typeof SIZES;
  className?: string;
}

/** A soft, tinted square holding an icon. */
export function IconTile({ icon: Icon, tone = 'slate', size = 'md', className }: IconTileProps): JSX.Element {
  const s = SIZES[size];
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center ring-1 ring-inset', s.box, TILE_TONES[tone], className)}>
      <Icon size={s.icon} strokeWidth={2} />
    </span>
  );
}
