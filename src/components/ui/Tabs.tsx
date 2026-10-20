import type { LucideIcon } from 'lucide-react';

import { cn } from './cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps<T extends string> {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Underline tabs that scroll sideways on narrow screens instead of wrapping. */
export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>): JSX.Element {
  return (
    <div className={cn('-mb-px flex gap-4 overflow-x-auto hide-scrollbar', className)} role="tablist">
      {items.map(({ value: itemValue, label, icon: Icon, count }) => {
        const active = itemValue === value;
        return (
          <button
            aria-selected={active}
            className={cn(
              'group flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[13px] font-medium transition-colors duration-150',
              active ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            )}
            key={itemValue}
            onClick={() => onChange(itemValue)}
            role="tab"
            type="button"
          >
            {Icon ? <Icon className={active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'} size={15} /> : null}
            {label}
            {count != null ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
