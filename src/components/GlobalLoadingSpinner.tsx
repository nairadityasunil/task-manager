import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLoading } from '@/context/LoadingContext';

/** Waiting this long before showing the bar keeps fast requests from flickering it. */
const SHOW_DELAY_MS = 150;

/** A slim progress bar along the top of the window while any API request is in flight. */
export default function GlobalLoadingSpinner(): JSX.Element | null {
  const { loadingCount } = useLoading();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loadingCount === 0) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loadingCount]);

  if (!visible) return null;

  return createPortal(
    <div
      aria-label="Loading"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[999999] h-[3px] overflow-hidden bg-emerald-500/15"
      role="progressbar"
    >
      <div className="top-progress-bar h-full w-1/3 rounded-full bg-emerald-500" />
    </div>,
    document.body
  );
}
