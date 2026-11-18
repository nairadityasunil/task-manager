import type { TimeEntry } from '@/services/time';

export type ExportFormat = 'csv' | 'xlsx';

export const EXPORT_HEADERS = ['Date', 'Person', 'Task', 'Hours', 'Duration', 'Note'] as const;

const hhmm = (minutes: number): string => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

/** One row per logged entry, oldest first. Hours is a number so sheets can add it up. */
export const toRows = (entries: TimeEntry[]): Array<[string, string, string, number, string, string]> =>
  [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.userName.localeCompare(b.userName))
    .map((e) => [e.date, e.userName, e.taskTitle ?? 'No task (general time)', Math.round((e.minutes / 60) * 100) / 100, hhmm(e.minutes), e.note]);

/** Text that a spreadsheet would run as a formula is prefixed with an apostrophe, so a note cannot execute. */
const safe = (value: string): string => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

const csvCell = (value: string | number): string => {
  const text = typeof value === 'number' ? String(value) : safe(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** RFC 4180 CSV with a byte-order mark so Excel reads accented names correctly. */
export const buildCsv = (entries: TimeEntry[]): Blob => {
  const lines = [EXPORT_HEADERS.join(','), ...toRows(entries).map((row) => row.map(csvCell).join(','))];
  return new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
};

export const buildXlsx = async (entries: TimeEntry[], sheetName: string): Promise<Blob> => {
  const { Workbook } = await import('exceljs');
  const book = new Workbook();
  const sheet = book.addWorksheet(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Timesheet');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Person', key: 'person', width: 24 },
    { header: 'Task', key: 'task', width: 40 },
    { header: 'Hours', key: 'hours', width: 9, style: { numFmt: '0.00' } },
    { header: 'Duration', key: 'duration', width: 10 },
    { header: 'Note', key: 'note', width: 48 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (const [date, person, task, hours, duration, note] of toRows(entries)) {
    sheet.addRow({ date, person, task, hours, duration, note: { text: note } });
  }
  const total = sheet.addRow({ task: 'Total', hours: { formula: `SUM(D2:D${sheet.rowCount})`, result: toRows(entries).reduce((n, r) => n + r[3], 0) } });
  total.font = { bold: true };
  const buffer = await book.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const download = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportFilename = (project: string, from: string, to: string, format: ExportFormat): string =>
  `timesheet-${project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-${from}_to_${to}.${format}`;
