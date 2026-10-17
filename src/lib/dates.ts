// Timezone-aware local-date helpers. A "localDate" is YYYY-MM-DD in the user's IANA timezone.

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(date: Date, tz: string) {
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(date)) out[p.type] = p.value;
  return out;
}

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localDateInTz(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function minutesSinceMidnightInTz(date: Date, tz: string): number {
  const p = parts(date, tz);
  return Number(p.hour) * 60 + Number(p.minute);
}

function toUtcMs(localDate: string): number {
  const [y, m, d] = localDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(localDate: string, n: number): string {
  const dt = new Date(toUtcMs(localDate) + n * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday .. 6 = Saturday */
export function weekdayOf(localDate: string): number {
  return new Date(toUtcMs(localDate)).getUTCDay();
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / 86400000);
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function startOfWeek(localDate: string): string {
  // Week starts Monday.
  const wd = weekdayOf(localDate);
  return addDays(localDate, -((wd + 6) % 7));
}

export function monthBounds(year: number, month1: number): { from: string; to: string } {
  const from = `${year}-${String(month1).padStart(2, '0')}-01`;
  const next = month1 === 12 ? `${year + 1}-01-01` : `${year}-${String(month1 + 1).padStart(2, '0')}-01`;
  return { from, to: addDays(next, -1) };
}

export function parseHHmm(hhmm: string): { hour: number; minute: number } | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export function minutesToHHmm(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmToMinutes(hhmm: string): number | null {
  const p = parseHHmm(hhmm);
  return p ? p.hour * 60 + p.minute : null;
}

export function formatMinutes12h(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function monthName(m1: number): string {
  return MONTHS[m1 - 1];
}
export function prettyDate(localDate: string): string {
  const [, m, d] = localDate.split('-').map(Number);
  return `${DAYS[weekdayOf(localDate)]}, ${MONTHS[m - 1].slice(0, 3)} ${d}`;
}
/** e.g. "Oct 17" */
export function shortDate(localDate: string): string {
  const [, m, d] = localDate.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}
export const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
