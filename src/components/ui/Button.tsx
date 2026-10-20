import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_1px_2px_rgba(5,150,105,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-inset ring-brand-700/50 hover:bg-brand-700 focus-visible:ring-emerald-500/30',
  accent:
    'bg-brand-600 text-white shadow-[0_1px_2px_rgba(5,150,105,0.25),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-inset ring-brand-700/50 hover:bg-brand-700 focus-visible:ring-emerald-500/30',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-900/30',
  secondary:
    'bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-emerald-500/20',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-emerald-500/20',
  danger: 'bg-white text-red-600 border border-red-200 shadow-sm hover:border-red-300 hover:bg-red-50 focus-visible:ring-red-600/20'
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3 text-[13px] gap-1.5',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8'
};

/** Shared class string, for links or other elements that should look like a button. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra?: string): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px',
    'focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    extra
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading = false, className, children, disabled, type = 'button', ...props },
  ref
) {
  const iconSize = size === 'sm' || size === 'icon-sm' ? 14 : 16;
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} ref={ref} type={type} {...props}>
      {loading ? <Loader2 className="animate-spin" size={iconSize} /> : Icon ? <Icon size={iconSize} /> : null}
      {children}
    </button>
  );
});
