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
    <div className={cn('-mb-px flex gap-5 overflow-x-auto hide-scrollbar', className)} role="tablist">
      {items.map(({ value: itemValue, label, icon: Icon, count }) => {
        const active = itemValue === value;
        return (
          <button
            aria-selected={active}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition-colors',
              active ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
            key={itemValue}
            onClick={() => onChange(itemValue)}
            role="tab"
            type="button"
          >
            {Icon ? <Icon size={15} /> : null}
            {label}
            {count != null ? <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
