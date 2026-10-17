import { formatMinutes12h } from './dates';
import type { HabitRule } from './scoring';

type H = HabitRule & { unit?: string | null };

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatHabitValue(h: H, value: number | null | undefined): string {
  if (value === null || value === undefined) return h.trackingType === 'boolean' ? 'Not yet' : 'Not logged';
  switch (h.trackingType) {
    case 'boolean':
      return value >= 1 ? 'Done' : 'Not yet';
    case 'timeOfDay':
      return formatMinutes12h(value);
    case 'duration':
      return `${formatNumber(value)} min`;
    default:
      return `${formatNumber(value)}${h.unit ? ' ' + h.unit : ''}`;
  }
}

export function describeTarget(h: H & { targetMax?: number | null }): string {
  const u = h.unit ? ` ${h.unit}` : '';
  switch (h.trackingType) {
    case 'boolean':
      return 'Daily check-off';
    case 'timeOfDay':
      return `${h.targetComparison === 'atLeast' ? 'After' : 'By'} ${formatMinutes12h(h.target)}`;
    case 'duration':
      return h.targetMax ? `${h.target}-${h.targetMax} min` : `${h.targetComparison === 'atMost' ? 'At most' : 'At least'} ${h.target} min`;
    default:
      if (h.targetComparison === 'atMost') return `At most ${formatNumber(h.target)}${u}`;
      return h.targetMax ? `${formatNumber(h.target)}-${formatNumber(h.targetMax)}${u}` : `At least ${formatNumber(h.target)}${u}`;
  }
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${totalSeconds}s`;
}
