/** "1.5", "1:30", "90m", "2h", "1h 30m" → minutes, or null when it is not a time. */
export const parseDuration = (raw: string): number | null => {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  let m = /^(\d+):(\d{1,2})$/.exec(text);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/.exec(text);
  if (m && (m[1] || m[2])) return Math.round(Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0));
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 60); // a bare number is hours
  return null;
};

/** 90 → "1h 30m", 120 → "2h", 0 → "" (empty cell). */
export const formatDuration = (minutes: number): string => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

export const shiftDay = (day: string, n: number): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dayLabel = (day: string): { weekday: string; date: string } => {
  const d = new Date(`${day}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  };
};
