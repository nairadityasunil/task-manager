import { cloneElement, useCallback, useEffect, useId, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';

import { cn } from './cn';
import { popoverPanelClass, usePopover } from './usePopover';

export interface MenuItem {
  id?: string;
  label: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | 'separator';

interface MenuProps {
  /** The element that opens the menu, usually a Button. It gets the ref, click handler and ARIA attributes. */
  trigger: ReactElement;
  items: MenuEntry[];
  align?: 'start' | 'end';
  label?: string;
}

/** A dropdown menu of actions with keyboard support (arrows, Home/End, Enter, Escape). */
export function Menu({ trigger, items, align = 'end', label }: MenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, style } = usePopover<HTMLElement, HTMLDivElement>({ open, onClose: close, placement: align === 'end' ? 'bottom-end' : 'bottom-start' });
  const menuId = useId();
  const actions = items.map((item, index) => ({ item, index })).filter(({ item }) => item !== 'separator' && !item.disabled);

  useEffect(() => {
    if (!open) return;
    setActive(actions[0]?.index ?? -1);
    window.setTimeout(() => panelRef.current?.focus(), 0);
  }, [open]);

  const run = (item: MenuItem) => {
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const position = actions.findIndex(({ index }) => index === active);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(actions[(position + 1) % actions.length]?.index ?? -1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(actions[(position - 1 + actions.length) % actions.length]?.index ?? -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(actions[0]?.index ?? -1);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(actions[actions.length - 1]?.index ?? -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const entry = items[active];
      if (entry && entry !== 'separator') run(entry);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const triggerProps = trigger.props as { onClick?: (event: React.MouseEvent) => void };
  return (
    <>
      {cloneElement(trigger, {
        ref: triggerRef,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: (event: React.MouseEvent) => {
          triggerProps.onClick?.(event);
          event.stopPropagation();
          setOpen((isOpen) => !isOpen);
        }
      } as Record<string, unknown>)}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              aria-label={label}
              className={cn(popoverPanelClass, 'min-w-[180px] outline-none')}
              id={menuId}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={onKeyDown}
              ref={panelRef}
              role="menu"
              style={style}
              tabIndex={-1}
            >
              {items.map((entry, index) =>
                entry === 'separator' ? (
                  <div className="my-1 h-px bg-slate-100" key={`sep-${index}`} role="separator" />
                ) : (
                  <div
                    aria-disabled={entry.disabled || undefined}
                    className={cn(
                      'flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5',
                      index === active && (entry.danger ? 'bg-red-50' : 'bg-slate-100 text-slate-900'),
                      entry.danger && 'text-red-700',
                      entry.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    key={entry.id ?? index}
                    onClick={() => !entry.disabled && run(entry)}
                    onMouseMove={() => !entry.disabled && setActive(index)}
                    role="menuitem"
                  >
                    {entry.icon ? <entry.icon aria-hidden className={entry.danger ? 'text-red-600' : 'text-slate-500'} size={14} /> : null}
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    {entry.hint ? <span className="ml-3 text-xs text-slate-500">{entry.hint}</span> : null}
                  </div>
                )
              )}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
