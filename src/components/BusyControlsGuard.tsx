import { useEffect } from 'react';

import { useLoading } from '@/context/LoadingContext';

/** Toggles, checkboxes, radios, dropdowns and menu items: the controls that change something the moment they are used. */
const GUARDED =
  'select, input[type="checkbox"], input[type="radio"], input[type="range"], ' +
  '[role="switch"], [role="checkbox"], [role="radio"], [role="combobox"], [role="option"], [role="menuitem"]';

/** Keys that would change a guarded control (Tab and Escape still work). */
const CHANGING_KEYS = new Set([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

/** Shows the dimmed look only after this long, like the loading bar, so quick saves do not flicker. */
const SHOW_DELAY_MS = 150;

/** Gives up after this long so a request that never ends cannot lock the page for good. */
const MAX_LOCK_MS = 30000;

const guarded = (target: EventTarget | null): boolean => target instanceof Element && target.closest(GUARDED) !== null;

/**
 * While a request that changes data is in flight (the loading bar is showing), controls cannot be changed:
 * a second click on a toggle or a different choice in a dropdown would race the first save.
 * Typing in text fields and plain buttons are left to each screen.
 */
export default function BusyControlsGuard(): null {
  const { mutatingCount } = useLoading();

  useEffect(() => {
    const root = document.documentElement;
    if (mutatingCount === 0) {
      delete root.dataset.busyControls;
      delete root.dataset.busyVisible;
      return;
    }

    root.dataset.busyControls = 'true';
    const show = window.setTimeout(() => {
      root.dataset.busyVisible = 'true';
    }, SHOW_DELAY_MS);
    const giveUp = window.setTimeout(() => {
      delete root.dataset.busyControls;
      delete root.dataset.busyVisible;
    }, MAX_LOCK_MS);

    const block = (event: Event): void => {
      if (root.dataset.busyControls !== 'true' || !guarded(event.target)) return;
      if (event instanceof KeyboardEvent && !CHANGING_KEYS.has(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const events: Array<keyof DocumentEventMap> = ['mousedown', 'click', 'keydown', 'touchstart'];
    events.forEach((name) => document.addEventListener(name, block, true));

    return () => {
      window.clearTimeout(show);
      window.clearTimeout(giveUp);
      events.forEach((name) => document.removeEventListener(name, block, true));
    };
  }, [mutatingCount]);

  return null;
}
