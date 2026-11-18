import { Download } from 'lucide-react';
import { useState } from 'react';

import Modal from '@/components/Modal';
import { Button, Input, cn } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { getTimeRange } from '@/services/time';
import { toDisplayErrorMessage } from '@/utils/apiError';

import { buildCsv, buildXlsx, download, exportFilename, type ExportFormat } from '../timesheetExport';
import { shiftDay, todayIso } from './time';

const monthStart = (day: string): string => `${day.slice(0, 8)}01`;

/** Export logged time between any two dates as CSV (opens anywhere) or Excel. */
export function ExportTimesheetModal({
  projectId,
  projectName,
  isAdmin,
  initialScope,
  onClose,
}: {
  projectId: string;
  projectName: string;
  isAdmin: boolean;
  initialScope: 'me' | 'all';
  onClose: () => void;
}): JSX.Element {
  const { showToast } = useToast();
  const today = todayIso();
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<'me' | 'all'>(isAdmin ? initialScope : 'me');
  const [busy, setBusy] = useState(false);

  const invalid = !from || !to ? 'Choose both dates' : to < from ? 'The end date is before the start' : to > today || from > today ? 'Dates in the future cannot be exported' : null;

  const presets: Array<[string, () => void]> = [
    ['This month', () => { setFrom(monthStart(today)); setTo(today); }],
    ['Last 30 days', () => { setFrom(shiftDay(today, -29)); setTo(today); }],
    ['Last 90 days', () => { setFrom(shiftDay(today, -89)); setTo(today); }],
  ];

  const run = async (): Promise<void> => {
    if (invalid) return;
    setBusy(true);
    try {
      const result = await getTimeRange(projectId, { from, to, scope: scope === 'all' ? 'all' : undefined });
      if (result.entries.length === 0) {
        showToast({ message: 'No time was logged in that range.', variant: 'error' });
        return;
      }
      const blob = format === 'csv' ? buildCsv(result.entries) : await buildXlsx(result.entries, 'Timesheet');
      download(blob, exportFilename(projectName, from, to, format));
      showToast({ message: `Exported ${result.entries.length} entries.`, variant: 'success' });
      onClose();
    } catch (error) {
      showToast({ message: toDisplayErrorMessage(error), variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      description="Every time entry in the range, one row each."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button data-testid="export-run" disabled={Boolean(invalid)} loading={busy} onClick={() => void run()}>
            <Download size={14} /> Export {format.toUpperCase()}
          </Button>
        </div>
      }
      onClose={onClose}
      title="Export timesheet"
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-[13px] font-medium text-slate-700">
            From
            <Input data-testid="export-from" max={to && to < today ? to : today} onChange={(e) => setFrom(e.target.value)} type="date" value={from} />
          </label>
          <label className="grid gap-1 text-[13px] font-medium text-slate-700">
            To
            <Input data-testid="export-to" max={today} min={from || undefined} onChange={(e) => setTo(e.target.value)} type="date" value={to} />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([label, apply]) => (
            <button className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" key={label} onClick={apply} type="button">
              {label}
            </button>
          ))}
        </div>
        {invalid ? <p className="m-0 text-xs text-red-700" role="alert">{invalid}</p> : null}

        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium text-slate-700">Format</span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[13px]" role="group" aria-label="Format">
            {([['csv', 'CSV'], ['xlsx', 'Excel (.xlsx)']] as const).map(([value, label]) => (
              <button
                aria-pressed={format === value}
                className={cn('flex-1 rounded-md px-2.5 py-1 font-medium transition-colors', format === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                key={value}
                onClick={() => setFormat(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isAdmin ? (
          <div className="grid gap-1.5">
            <span className="text-[13px] font-medium text-slate-700">Whose time</span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[13px]" role="group" aria-label="Whose time">
              {([['me', 'My time'], ['all', 'Everyone']] as const).map(([value, label]) => (
                <button
                  aria-pressed={scope === value}
                  className={cn('flex-1 rounded-md px-2.5 py-1 font-medium transition-colors', scope === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
                  key={value}
                  onClick={() => setScope(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
