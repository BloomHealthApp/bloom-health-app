// Pure view-model logic for the period tracker screen and the Home cycle card (no React / RN), so it is unit-testable.
import { livePeriods, periodLength, predictedWindowDates, type Prediction } from './cycle';
import { addDays, diffDays, monthBounds, shortDate, weekdayOf } from './dates';
import { validatePeriod, periodErrorMessage } from './periodRules';
import type { MascotMood } from '@/components/mascotTypes';
import { PERIOD_MAX_DAYS, PERIOD_MAX_SYMPTOMS, type Period, type PeriodFlow, type PeriodMood, type PeriodSymptom } from '@/types/api';

export interface PeriodDraft {
  startDate: string;
  endDate: string | null;
  flow: PeriodFlow;
  symptoms: PeriodSymptom[];
  mood: PeriodMood | null;
  note: string | null;
}

export const FLOW_LABELS: Record<PeriodFlow, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
export const SYMPTOM_LABELS: Record<PeriodSymptom, string> = {
  cramps: 'Cramps',
  headache: 'Headache',
  bloating: 'Bloating',
  fatigue: 'Fatigue',
  mood_swings: 'Mood swings',
  backache: 'Backache',
  acne: 'Acne',
  nausea: 'Nausea',
  cravings: 'Cravings',
  tender_breasts: 'Tender breasts',
};
export const MOOD_LABELS: Record<PeriodMood, string> = { happy: 'Happy', calm: 'Calm', sad: 'Sad', irritable: 'Irritable', anxious: 'Anxious' };

export const DISCLAIMER_PERIODS = 'Estimates only, not medical advice.';
export const PRIVACY_NOTE = 'Private to you. Period data stays in your account and is never shown to anyone you share Bloom Health with.';

export const emptyDraft = (startDate: string): PeriodDraft => ({ startDate, endDate: null, flow: 'medium', symptoms: [], mood: null, note: null });
export const draftFromPeriod = (p: Period): PeriodDraft => ({ startDate: p.startDate, endDate: p.endDate, flow: p.flow, symptoms: [...p.symptoms], mood: p.mood, note: p.note });

/** Adds or removes `v`; refuses to grow past `max`. */
export function toggleItem<T>(list: T[], v: T, max = PERIOD_MAX_SYMPTOMS): T[] {
  if (list.includes(v)) return list.filter((x) => x !== v);
  return list.length >= max ? list : [...list, v];
}

/** First validation message for a draft against the owner's other periods, or null when it can be saved. */
export function draftError(draft: PeriodDraft, periods: Period[], today: string, selfId?: string): string | null {
  const e = validatePeriod(draft, periods, today, selfId);
  return e ? periodErrorMessage(e) : null;
}

/** Latest sensible end date for a draft (never beyond today or the 14-day limit). */
export function maxEndDate(startDate: string, today: string): string {
  const cap = addDays(startDate, PERIOD_MAX_DAYS - 1);
  return cap < today ? cap : today;
}

export type CellKind = 'period' | 'predicted' | 'none';
export interface CalendarCell {
  date: string;
  day: number;
  kind: CellKind;
  isToday: boolean;
  isFuture: boolean;
}

export function monthFor(today: string, offset: number): { year: number; month: number } {
  const [y, m] = today.split('-').map(Number);
  const idx = y * 12 + (m - 1) + offset;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** Sunday-first month grid (null = leading blank). Period days win over the predicted window. */
export function buildMonth(year: number, month: number, periods: Period[], pred: Prediction, today: string): (CalendarCell | null)[] {
  const { from, to } = monthBounds(year, month);
  const periodDays = new Set<string>();
  for (const p of livePeriods(periods)) {
    const end = p.endDate ?? today;
    if (p.startDate > end) continue;
    for (let d = p.startDate < from ? from : p.startDate; d <= end && d <= to; d = addDays(d, 1)) periodDays.add(d);
  }
  const predicted = new Set(predictedWindowDates(pred, today));
  const out: (CalendarCell | null)[] = Array(weekdayOf(from)).fill(null);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push({
      date: d,
      day: Number(d.slice(8)),
      kind: periodDays.has(d) ? 'period' : predicted.has(d) ? 'predicted' : 'none',
      isToday: d === today,
      isFuture: d > today,
    });
  }
  return out;
}

export function cellLabel(c: CalendarCell): string {
  const base = shortDate(c.date);
  if (c.kind === 'period') return `${base}, period day`;
  if (c.kind === 'predicted') return `${base}, in the estimated window for the next period`;
  return c.isFuture ? `${base}, upcoming` : base;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export interface CycleSummary {
  title: string;
  subtitle: string;
  mood: MascotMood;
}

/** Short copy for the tracker header and the Home cycle card. Never exposed to viewers (they never render it). */
export function cycleSummary(pred: Prediction, hasPeriods: boolean): CycleSummary {
  switch (pred.state) {
    case 'ongoing':
      return { title: `Day ${pred.dayOfPeriod ?? 1} of period`, subtitle: 'Be gentle with yourself today.', mood: 'sleepy' };
    case 'upcoming': {
      const next = pred.nextStart as string;
      const du = pred.daysUntil ?? 0;
      return {
        title: `Next period ~${shortDate(next)}`,
        subtitle: du > 0 ? `In about ${plural(du, 'day')}` : du === 0 ? 'Expected around today' : 'Expected any day now',
        mood: 'happy',
      };
    }
    case 'late':
      return { title: 'Period may be late', subtitle: `Expected around ${shortDate(pred.nextStart as string)}, ${plural(pred.daysLate ?? 0, 'day')} ago. Estimates can be off.`, mood: 'thinking' };
    default:
      return hasPeriods
        ? { title: 'Log a few cycles to see an estimate', subtitle: pred.cycleCount === 0 ? 'Two full cycles are needed.' : `${plural(pred.cycleCount, 'cycle')} logged so far, two are needed.`, mood: 'thinking' }
        : { title: 'Start tracking', subtitle: 'Log the first day of your period when it begins.', mood: 'happy' };
  }
}

export interface StatLine {
  label: string;
  value: string;
}
export function statLines(pred: Prediction): StatLine[] {
  return [
    { label: 'Average cycle', value: pred.averageCycle !== null ? `${pred.averageCycle} days` : '—' },
    { label: 'Average period', value: pred.averagePeriod !== null ? `${pred.averagePeriod} days` : '—' },
    { label: 'Cycles logged', value: String(pred.cycleCount) },
    { label: 'Next estimate', value: pred.nextStart ? `~${shortDate(pred.nextStart)}` : '—' },
  ];
}

export interface HistoryRow {
  period: Period;
  title: string;
  subtitle: string;
}
/** Newest first: title "Oct 3 – Oct 7" (or "Oct 3 – ongoing"), subtitle "5 days · Medium · Cramps". */
export function historyRows(periods: Period[], today: string): HistoryRow[] {
  return livePeriods(periods)
    .reverse()
    .map((period) => {
      const len = periodLength(period);
      const range = period.endDate ? `${shortDate(period.startDate)} – ${shortDate(period.endDate)}` : `${shortDate(period.startDate)} – ongoing`;
      const days = len ?? diffDays(today, period.startDate) + 1;
      const bits = [plural(days, 'day'), FLOW_LABELS[period.flow], ...period.symptoms.slice(0, 2).map((s) => SYMPTOM_LABELS[s])];
      return { period, title: range, subtitle: bits.join(' · ') };
    });
}

/** An ongoing period past the allowed length needs a nudge (the server rejects ends beyond 14 days). */
export function overdueOngoing(periods: Period[], today: string): Period | null {
  const live = livePeriods(periods);
  const ongoing = live.filter((p) => !p.endDate).pop();
  return ongoing && diffDays(today, ongoing.startDate) + 1 > PERIOD_MAX_DAYS ? ongoing : null;
}
