import { addDays } from './dates';

export const DEVICE_STEPS_DAYS = 7;

export interface StepLogView {
  value: number | null;
  status: string;
  source?: 'manual' | 'device';
  deletedAt?: string | null;
}

/** The dates to read, oldest first. `latest` keeps them within what the service accepts as today. */
export function deviceStepDates(today: string, latest: string): string[] {
  const last = latest < today ? latest : today;
  return Array.from({ length: DEVICE_STEPS_DAYS }, (_, i) => addDays(last, i - DEVICE_STEPS_DAYS + 1));
}

/**
 * Whether a phone total may replace a log. Totals of 0 and drops are ignored because iOS reports a
 * denied read as no data, which must never wipe a good value. Logs without a source predate
 * auto-tracking, so they count as manual.
 */
export function shouldWriteDeviceSteps(log: StepLogView | null | undefined, total: number): boolean {
  if (total <= 0) return false;
  if (!log || log.deletedAt) return true;
  if (log.status === 'skipped') return false;
  const saved = log.value ?? 0;
  if (log.source !== 'device' && saved > 0) return false;
  return total > saved;
}
