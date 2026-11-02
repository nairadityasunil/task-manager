import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '@/components/ui';

interface ModalProps {
  backdropClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  title: ReactNode;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** Clicking outside the panel closes it (default). Turn off for editors so work is not lost by a stray click. */
  dismissOnBackdrop?: boolean;
  /** Hide the close button (the dialog must be finished with its own buttons). */
  hideClose?: boolean;
  /** Body without padding or scrolling, for dialogs that lay out their own scroll area and sticky footer. */
  plainBody?: boolean;
  /** Optional line under the title. */
  description?: ReactNode;
  /** Optional sticky footer, usually the dialog's buttons. */
  footer?: ReactNode;
  maxWidth?: string;
}

/**
 * The standard dialog: a header with the title and a close button, a scrolling body and an optional footer.
 * Full width (with a small margin) on phones, centred with a max width from `sm` up.
 */
function Modal({
  backdropClassName,
  bodyClassName,
  children,
  onClose,
  panelClassName,
  title,
  description,
  footer,
  maxWidth = 'max-w-[540px]',
  closeLabel = 'Close modal',
  dismissOnBackdrop = true,
  hideClose = false,
  plainBody = false
}: ModalProps): JSX.Element {
  const titleId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  if (portalTarget == null) {
    return <></>;
  }

  return createPortal(
    <div
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      aria-labelledby={typeof title === 'string' ? undefined : titleId}
      className={cn('fixed inset-0 z-[5500] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6', backdropClassName)}
      onClick={dismissOnBackdrop ? onClose : undefined}
      role="dialog"
    >
      <div
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-modalIn',
          maxWidth,
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 pt-0.5">
            <h2 className="m-0 truncate text-[15px] font-semibold text-slate-900" id={titleId}>
              {title}
            </h2>
            {description ? <p className="m-0 mt-0.5 text-[13px] text-slate-500">{description}</p> : null}
          </div>
          {hideClose ? null : (
            <button
              aria-label={closeLabel}
              className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className={plainBody ? cn('flex min-h-0 flex-1 flex-col', bodyClassName) : cn('grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-5 overflow-y-auto p-4', bodyClassName)}>{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    portalTarget
  );
}

export default Modal;
