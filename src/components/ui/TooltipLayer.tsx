import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Tip {
  text: string;
  rect: DOMRect;
  side: 'top' | 'bottom' | 'right';
}

const DELAY_MS = 450;

/**
 * Replaces the browser's `title` tooltips app-wide with styled ones. While an element with a title is hovered or
 * keyboard-focused, its title moves to data-tip (so the native tooltip never shows) and comes back on leave.
 */
export function TooltipLayer(): JSX.Element | null {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number>();
  const current = useRef<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // Place after measuring, keeping the whole tooltip on screen.
  useLayoutEffect(() => {
    if (!tip || !box.current) return setPosition(null);
    const { width, height } = box.current.getBoundingClientRect();
    const { rect, side } = tip;
    let left = side === 'right' ? rect.right + 8 : rect.left + rect.width / 2 - width / 2;
    let top = side === 'right' ? rect.top + rect.height / 2 - height / 2 : side === 'bottom' ? rect.bottom + 6 : rect.top - 6 - height;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    top = Math.min(Math.max(8, top), window.innerHeight - height - 8);
    setPosition({ left, top });
  }, [tip]);

  useEffect(() => {
    const restore = () => {
      window.clearTimeout(timer.current);
      const element = current.current;
      if (element?.dataset.tip != null) {
        if (!element.hasAttribute('title')) element.setAttribute('title', element.dataset.tip);
        delete element.dataset.tip;
      }
      current.current = null;
      setTip(null);
    };

    const show = (element: HTMLElement, immediate: boolean) => {
      if (current.current === element) return;
      restore();
      const text = element.getAttribute('title');
      if (!text || !text.trim()) return;
      current.current = element;
      element.dataset.tip = text;
      element.removeAttribute('title');
      if (!element.getAttribute('aria-label') && !element.textContent?.trim()) element.setAttribute('aria-label', text);
      timer.current = window.setTimeout(
        () => {
          if (current.current !== element || !element.isConnected) return;
          const rect = element.getBoundingClientRect();
          const preferred = element.closest<HTMLElement>('[data-tip-side]')?.dataset.tipSide;
          setTip({ text, rect, side: preferred === 'right' ? 'right' : rect.top < 48 ? 'bottom' : 'top' });
        },
        immediate ? 0 : DELAY_MS
      );
    };

    const titled = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const element = target.closest<HTMLElement>('[title]:not(svg):not(svg *), [data-tip]');
      return element instanceof HTMLElement ? element : null;
    };

    const onOver = (event: MouseEvent) => {
      const element = titled(event.target);
      if (element) show(element, false);
      else if (current.current && !(event.target instanceof Node && current.current.contains(event.target))) restore();
    };
    const onFocus = (event: FocusEvent) => {
      const element = titled(event.target);
      if (element && element === event.target && (element as HTMLElement).matches(':focus-visible')) show(element, true);
    };
    const onHide = () => restore();

    document.addEventListener('mouseover', onOver);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onHide);
    document.addEventListener('mousedown', onHide, true);
    document.addEventListener('scroll', onHide, true);
    window.addEventListener('blur', onHide);
    return () => {
      restore();
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onHide);
      document.removeEventListener('mousedown', onHide, true);
      document.removeEventListener('scroll', onHide, true);
      window.removeEventListener('blur', onHide);
    };
  }, []);

  if (!tip || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[10000] max-w-[280px] rounded-md bg-slate-900 px-2 py-1 text-[12px] leading-snug text-white shadow-lg"
      ref={box}
      role="tooltip"
      style={{ left: position?.left ?? -9999, top: position?.top ?? -9999, visibility: position ? 'visible' : 'hidden' }}
    >
      {tip.text}
    </div>,
    document.body
  );
}
