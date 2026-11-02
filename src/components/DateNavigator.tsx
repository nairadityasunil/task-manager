import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

import { Calendar, parseIsoDate, popoverPanelClass, usePopover } from '@/components/ui';

interface DateNavigatorProps {
  date: string;
  disabled?: boolean;
  onChange: (nextDate: string) => void;
}

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const shiftDate = (date: string, days: number): string => {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);

  const year = nextDate.getFullYear();
  const month = `${nextDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${nextDate.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/** Shared small secondary button used inside the date navigator */
const NavBtn = ({ children, disabled, onClick, title }: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}): JSX.Element => (
  <button
    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-40"
    disabled={disabled}
    onClick={onClick}
    title={title}
    type="button"
  >
    {children}
  </button>
);

function DateNavigator({ date, disabled = false, onChange }: DateNavigatorProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, style } = usePopover<HTMLButtonElement, HTMLDivElement>({ open, onClose: close });

  const today = getTodayDate();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      <NavBtn disabled={disabled} onClick={() => onChange(shiftDate(date, -1))} title="Previous Day">
        <ChevronLeft size={16} />
      </NavBtn>

      {/* Date pill: opens a calendar */}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Choose date"
        className="flex h-8 min-w-[136px] items-center gap-2 rounded-md bg-white px-2.5 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        ref={triggerRef}
        type="button"
      >
        <CalendarDays className="shrink-0 text-slate-400" size={15} />
        <span className="whitespace-nowrap text-[13px] font-medium text-slate-700">
          {(parseIsoDate(date) ?? new Date()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </button>
      {open
        ? createPortal(
            <div aria-label="Choose date" className={popoverPanelClass} data-calendar ref={panelRef} role="dialog" style={style}>
              <Calendar
                autoFocus
                onSelect={(next) => {
                  setOpen(false);
                  onChange(next);
                }}
                value={date}
              />
            </div>,
            document.body
          )
        : null}

      <NavBtn disabled={disabled} onClick={() => onChange(shiftDate(date, 1))} title="Next Day">
        <ChevronRight size={16} />
      </NavBtn>

      <NavBtn disabled={disabled || date === today} onClick={() => onChange(today)} title="Go to Today">
        <RotateCcw size={14} />
        {/* <span className="text-[13px] ml-0.5">Today</span> */}
      </NavBtn>
    </div>
  );
}

export default DateNavigator;