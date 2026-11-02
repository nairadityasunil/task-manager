import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

export type PopoverPlacement = 'bottom-start' | 'bottom-end';

interface Options {
  open: boolean;
  onClose: () => void;
  placement?: PopoverPlacement;
  /** Make the panel at least as wide as the trigger. */
  matchWidth?: boolean;
  gap?: number;
}

/**
 * Positions a floating panel (rendered in a portal) next to its trigger: below by default, above when there is no room.
 * Closes on a click outside both elements, on Escape and when the page scrolls the trigger out of view.
 */
export function usePopover<T extends HTMLElement, P extends HTMLElement>({
  open,
  onClose,
  placement = 'bottom-start',
  matchWidth = false,
  gap = 4
}: Options): { triggerRef: RefObject<T>; panelRef: RefObject<P>; style: CSSProperties } {
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<P>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: -9999, left: -9999 });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const width = matchWidth ? Math.max(rect.width, panel.offsetWidth) : panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const below = viewportH - rect.bottom - gap;
    const above = rect.top - gap;
    const openUp = height > below && above > below;
    let left = placement === 'bottom-end' ? rect.right - width : rect.left;
    left = Math.min(Math.max(8, left), Math.max(8, viewportW - width - 8));
    const maxHeight = Math.max(160, (openUp ? above : below) - 8);
    setStyle({
      position: 'fixed',
      left,
      top: openUp ? Math.max(8, rect.top - gap - Math.min(height, maxHeight)) : rect.bottom + gap,
      minWidth: matchWidth ? rect.width : undefined,
      maxHeight,
      zIndex: 9500
    });
  }, [gap, matchWidth, placement]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        triggerRef.current?.focus();
      }
    };
    const onScroll = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      place();
    };
    const observer = typeof ResizeObserver !== 'undefined' && panelRef.current ? new ResizeObserver(() => place()) : null;
    if (observer && panelRef.current) observer.observe(panelRef.current);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      observer?.disconnect();
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  return { triggerRef, panelRef, style };
}

/** Shared look for floating panels (dropdowns, menus, calendars). */
export const popoverPanelClass =
  'overflow-auto rounded-lg border border-slate-200 bg-white p-1 text-[13px] text-slate-700 shadow-[0_12px_32px_rgba(28,25,23,0.14),0_2px_6px_rgba(28,25,23,0.06)] animate-[popIn_120ms_ease-out]';
