export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 8;

/** Exponential backoff 2s -> 5min with +/-20% jitter. attempt is 1-based (the attempt that just failed). */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  const jitter = 0.8 + random() * 0.4;
  return Math.min(BACKOFF_MAX_MS, Math.round(base * jitter));
}
