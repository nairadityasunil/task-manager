import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from "react-icons/md";

interface ModalProps {
  backdropClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  title: string;
  maxWidth?: string;
}

function Modal({ backdropClassName, bodyClassName, children, onClose, panelClassName, title, maxWidth = 'max-w-[540px]' }: ModalProps): JSX.Element {
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
      className={[
        'fixed inset-0 z-[1000] flex items-center justify-center',
        'bg-slate-950/40 backdrop-blur-sm p-3 sm:p-5',
        backdropClassName ?? ''
      ].join(' ')}
      onClick={onClose}
      role="dialog"
    >
      <div
        className={[
          'relative w-full max-h-[90vh] overflow-y-auto',
          maxWidth,
          'bg-white border border-slate-200',
          'rounded-lg shadow-xl',
          'animate-modalIn',
          panelClassName ?? ''
        ].join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-200 bg-white rounded-t-lg">
          <h2 className="text-base font-semibold m-0 text-slate-900">{title}</h2>
          <button
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            onClick={onClose}
            type="button"
          >
            <MdClose size={18} />
          </button>
        </div>
        {/* Body */}
        <div className={['p-4 sm:p-6 grid gap-5', bodyClassName ?? ''].join(' ')}>{children}</div>
      </div>
    </div>,
    portalTarget
  );
}

export default Modal;