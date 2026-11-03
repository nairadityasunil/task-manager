import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

import { cn } from './cn';
import { useFieldLabelId } from './Field';
import { popoverPanelClass, usePopover } from './usePopover';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

/** Shaped like a change event so handlers written for a native select keep working. */
export interface SelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

export interface SelectProps {
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (event: SelectChangeEvent) => void;
  /** Same as onChange, with just the value. */
  onValueChange?: (value: string) => void;
  /** Options as data. `<option>` and `<optgroup>` children work too. */
  options?: SelectOption[];
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  title?: string;
  /** Show a search box (on by default when there are more than 10 options). */
  searchable?: boolean;
  onBlur?: () => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'data-testid'?: string;
  /** Replaces the default box styling entirely (e.g. a heading that opens a dropdown). */
  triggerClassName?: string;
  /** 'sm' is 32px tall with 12px text. Inferred from old classes when not given. */
  size?: 'sm' | 'md';
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

/** Reads `<option>` / `<optgroup>` children (through fragments and arrays) into plain options. */
function optionsFromChildren(children: ReactNode, group?: string): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode; value?: string | number; label?: string; disabled?: boolean }>;
    if (element.type === Fragment) {
      out.push(...optionsFromChildren(element.props.children, group));
    } else if (element.type === 'optgroup') {
      out.push(...optionsFromChildren(element.props.children, element.props.label));
    } else if (element.type === 'option') {
      const label = textOf(element.props.children);
      out.push({ value: element.props.value != null ? String(element.props.value) : label, label, disabled: element.props.disabled, group });
    }
  });
  return out;
}

/**
 * Callers sometimes pass old one-off styling. Only layout classes (width, margins, flex, position) and `!important`
 * overrides are kept, so every dropdown looks the same; small text or padding switches to the compact size.
 */
const LAYOUT_CLASS = /^!|^(?:[a-z0-9-]+:)*-?(?:w-|min-w-|max-w-|flex-|flex$|grow|shrink|basis-|m[trblxy]?-|col-|row-|self-|order-|hidden$|block$|sr-only$|absolute$|relative$|z-|top-|left-|right-|bottom-|truncate$)/;
const COMPACT_CLASS = /^(?:text-xs|text-\[1[12]px\]|py-0\.5|py-1|py-1\.5|h-7|h-8)$/;

function splitClassName(className?: string): { layout: string; compact: boolean } {
  const tokens = (className ?? '').split(/\s+/).filter(Boolean);
  return { layout: tokens.filter((token) => LAYOUT_CLASS.test(token)).join(' '), compact: tokens.some((token) => COMPACT_CLASS.test(token)) };
}

const triggerBase =
  'relative inline-flex min-w-0 items-center rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-left text-slate-900 shadow-sm transition-colors ' +
  'hover:border-slate-400 focus:outline-none focus-visible:border-brand-500 focus-visible:ring-[3px] focus-visible:ring-brand-600/20 ' +
  'aria-expanded:border-brand-500 aria-expanded:ring-[3px] aria-expanded:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

/** A dropdown that replaces the browser's select: keyboard, type-ahead, groups and optional search. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    value,
    defaultValue,
    onChange,
    onValueChange,
    options: optionsProp,
    children,
    placeholder,
    disabled,
    required,
    name,
    id,
    className,
    title,
    searchable,
    onBlur,
    size,
    triggerClassName,
    ...aria
  },
  ref
) {
  const { layout, compact } = splitClassName(className);
  const small = size ? size === 'sm' : compact;
  const options = useMemo(() => optionsProp ?? optionsFromChildren(children), [optionsProp, children]);
  const [inner, setInner] = useState(defaultValue != null ? String(defaultValue) : undefined);
  const current = value !== undefined ? (value == null ? '' : String(value)) : inner;
  const selected = options.find((option) => option.value === current) ?? (placeholder ? undefined : options[0]);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, style } = usePopover<HTMLButtonElement, HTMLDivElement>({ open, onClose: close, matchWidth: true });
  useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);
  const listId = useId();
  const fieldLabelId = useFieldLabelId();
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const showSearch = searchable ?? options.length > 10;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const index = options.findIndex((option) => option.value === selected?.value);
    setActive(index >= 0 ? index : options.findIndex((option) => !option.disabled));
    if (showSearch) window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, panelRef]);

  const commit = (option: SelectOption | undefined) => {
    if (!option || option.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (option.value === current) return;
    if (value === undefined) setInner(option.value);
    const event = { target: { value: option.value, name }, currentTarget: { value: option.value, name } };
    onChange?.(event);
    onValueChange?.(option.value);
  };

  const move = (from: number, step: 1 | -1) => {
    for (let i = from + step; i >= 0 && i < visible.length; i += step) if (!visible[i].disabled) return i;
    return from;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => move(index, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => move(index, -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(move(-1, 1));
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(move(visible.length, -1));
    } else if (event.key === 'Enter' || (event.key === ' ' && !showSearch)) {
      event.preventDefault();
      commit(visible[active]);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (!showSearch && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      const now = Date.now();
      typeahead.current = { text: (now - typeahead.current.at < 700 ? typeahead.current.text : '') + event.key.toLowerCase(), at: now };
      const hit = visible.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(typeahead.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <>
      <button
        aria-labelledby={aria['aria-labelledby'] ?? (aria['aria-label'] ? undefined : fieldLabelId)}
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        className={triggerClassName ? cn('relative inline-flex min-w-0 items-center pr-7 text-left focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-600/20', triggerClassName) : cn(triggerBase, small ? 'h-8 text-[12px]' : 'h-9 text-[13px]', !/(^|\s|:)w-/.test(layout) && 'w-full', layout)}
        data-value={current ?? ''}
        disabled={disabled}
        id={id}
        name={name}
        onBlur={onBlur}
        onClick={(event) => {
          event.preventDefault();
          setOpen((isOpen) => !isOpen);
        }}
        onKeyDown={onKeyDown}
        ref={triggerRef}
        role="combobox"
        title={title}
        type="button"
        {...aria}
      >
        <span className={cn('block min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>{selected ? selected.label : placeholder ?? ''}</span>
        <ChevronDown aria-hidden className={cn('pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-transform', open && 'rotate-180')} size={15} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className={cn(popoverPanelClass, 'flex flex-col')} onKeyDown={onKeyDown} ref={panelRef} style={style}>
              {showSearch ? (
                <label className="mb-1 flex h-8 shrink-0 items-center gap-2 border-b border-slate-100 px-2">
                  <Search aria-hidden className="text-slate-400" size={14} />
                  <input
                    aria-label="Search options"
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActive(0);
                    }}
                    placeholder="Search…"
                    ref={searchRef}
                    value={query}
                  />
                </label>
              ) : null}
              <div aria-label={aria['aria-label']} className="min-h-0 overflow-y-auto" id={listId} role="listbox">
                {visible.length === 0 ? <div className="px-2.5 py-2 text-slate-500">No matches</div> : null}
                {visible.map((option, index) => (
                  <Fragment key={`${option.group ?? ''}-${option.value}-${index}`}>
                    {option.group && option.group !== visible[index - 1]?.group ? (
                      <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">{option.group}</div>
                    ) : null}
                    <div
                      aria-disabled={option.disabled || undefined}
                      aria-selected={option.value === current}
                      className={cn(
                        'flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5',
                        index === active && 'bg-slate-100 text-slate-900',
                        option.value === current && 'font-medium text-slate-900',
                        option.disabled && 'cursor-not-allowed opacity-50'
                      )}
                      data-index={index}
                      data-value={option.value}
                      onClick={() => commit(option)}
                      onMouseMove={() => setActive(index)}
                      role="option"
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label || ' '}</span>
                      {option.value === current ? <Check aria-hidden className="shrink-0 text-brand-600" size={14} /> : null}
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
});
