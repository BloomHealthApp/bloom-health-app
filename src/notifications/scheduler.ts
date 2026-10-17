// Pure reminder planning + idempotent scheduling against an injected notifications API,
// so permission denial, timezone change and duplicate-prevention are unit-testable.
import { REMINDER_LABELS } from '@/lib/defaults';
import { parseHHmm } from '@/lib/dates';
import type { Reminder } from '@/types/api';

export const ID_PREFIX = 'bubu.reminder.';
export const SIGNATURE_KEY = 'reminderSignature';

export interface PlannedReminder {
  identifier: string;
  key: Reminder['key'];
  hour: number;
  minute: number;
  title: string;
  body: string;
}

export interface NotifApi {
  getPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  requestPermissions(): Promise<{ granted: boolean }>;
  getScheduledIds(): Promise<string[]>;
  schedule(p: PlannedReminder): Promise<void>;
  cancel(identifier: string): Promise<void>;
  /** One-off notification at a date. Optional: runtimes without it simply cannot show date reminders. */
  scheduleAt?(p: OneOffReminder): Promise<void>;
}

export interface OneOffReminder {
  identifier: string;
  title: string;
  body: string;
  date: Date;
}

export function buildPlan(reminders: Reminder[]): PlannedReminder[] {
  const seen = new Set<string>();
  const out: PlannedReminder[] = [];
  for (const r of reminders) {
    if (!r.enabled || seen.has(r.key)) continue; // one notification per key => no duplicates
    const t = parseHHmm(r.time);
    if (!t) continue;
    seen.add(r.key);
    out.push({ identifier: ID_PREFIX + r.key, key: r.key, hour: t.hour, minute: t.minute, ...REMINDER_LABELS[r.key] });
  }
  return out;
}

export function planSignature(plan: PlannedReminder[], timezone: string): string {
  return `${timezone}|${plan.map((p) => `${p.key}@${p.hour}:${p.minute}`).sort().join(',')}`;
}

export type SyncResult =
  | { status: 'scheduled'; count: number; skipped: boolean }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'disabled' };

export interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string | null): Promise<void>;
}

export async function syncReminders(args: {
  api: NotifApi;
  storage: Storage;
  reminders: Reminder[];
  timezone: string;
  /** true only when the user explicitly turned reminders on (prompt allowed) */
  askPermission: boolean;
}): Promise<SyncResult> {
  const { api, storage, reminders, timezone, askPermission } = args;
  const plan = buildPlan(reminders);
  const existing = (await api.getScheduledIds()).filter((id) => id.startsWith(ID_PREFIX));

  if (plan.length === 0) {
    for (const id of existing) await api.cancel(id);
    await storage.set(SIGNATURE_KEY, null);
    return { status: 'disabled' };
  }

  let perm = await api.getPermissions();
  if (!perm.granted && askPermission && perm.canAskAgain) {
    const r = await api.requestPermissions();
    perm = { granted: r.granted, canAskAgain: false };
  }
  if (!perm.granted) {
    for (const id of existing) await api.cancel(id);
    await storage.set(SIGNATURE_KEY, null);
    return { status: 'denied', canAskAgain: perm.canAskAgain };
  }

  const sig = planSignature(plan, timezone);
  const wanted = new Set(plan.map((p) => p.identifier));
  const uptodate = (await storage.get(SIGNATURE_KEY)) === sig && plan.every((p) => existing.includes(p.identifier)) && existing.every((id) => wanted.has(id));
  if (uptodate) return { status: 'scheduled', count: plan.length, skipped: true };

  // Cancel everything of ours first, then schedule with stable identifiers: re-running never duplicates.
  for (const id of existing) await api.cancel(id);
  for (const p of plan) await api.schedule(p);
  await storage.set(SIGNATURE_KEY, sig);
  return { status: 'scheduled', count: plan.length, skipped: false };
}

export async function cancelAllReminders(api: NotifApi, storage: Storage): Promise<void> {
  for (const id of (await api.getScheduledIds()).filter((i) => i.startsWith(ID_PREFIX))) await api.cancel(id);
  await storage.set(SIGNATURE_KEY, null);
  await cancelPeriodReminder(api, storage);
}

// ---------------- optional "period may start soon" reminder ----------------
// Its own identifier (not under ID_PREFIX, so syncReminders never touches it). The text is deliberately generic:
// notifications show on the lock screen, so the word "period" appears only inside the app.
export const PERIOD_REMINDER_ID = 'bubu.cycle.heads-up';
export const PERIOD_REMINDER_SIGNATURE_KEY = 'periodReminderSignature';
export const PERIOD_REMINDER_LEAD_DAYS = 2;
export const PERIOD_REMINDER_HOUR = 9;

export function planPeriodReminder(nextStart: string | null, now: Date): OneOffReminder | null {
  if (!nextStart) return null;
  const [y, m, d] = nextStart.split('-').map(Number);
  const date = new Date(y, m - 1, d - PERIOD_REMINDER_LEAD_DAYS, PERIOD_REMINDER_HOUR, 0, 0, 0);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now.getTime()) return null;
  return { identifier: PERIOD_REMINDER_ID, title: 'Bubu Bloom', body: 'A gentle heads-up. Take a moment to check in with yourself today.', date };
}

export type PeriodReminderResult = { status: 'off' } | { status: 'nothing_to_schedule' } | { status: 'unavailable' } | { status: 'denied'; canAskAgain: boolean } | { status: 'scheduled'; at: string; skipped: boolean };

export async function cancelPeriodReminder(api: NotifApi, storage: Storage): Promise<void> {
  if ((await api.getScheduledIds()).includes(PERIOD_REMINDER_ID)) await api.cancel(PERIOD_REMINDER_ID);
  await storage.set(PERIOD_REMINDER_SIGNATURE_KEY, null);
}

/** Idempotent: schedules at most one reminder; degrades to 'unavailable' (Expo Go / no date triggers) or 'denied' without throwing. */
export async function syncPeriodReminder(args: {
  api: NotifApi;
  storage: Storage;
  enabled: boolean;
  nextStart: string | null;
  askPermission: boolean;
  now?: Date;
}): Promise<PeriodReminderResult> {
  const { api, storage, enabled, nextStart, askPermission } = args;
  const plan = enabled ? planPeriodReminder(nextStart, args.now ?? new Date()) : null;
  if (!enabled) {
    await cancelPeriodReminder(api, storage);
    return { status: 'off' };
  }
  if (!plan) {
    await cancelPeriodReminder(api, storage);
    return { status: 'nothing_to_schedule' };
  }
  if (!api.scheduleAt) return { status: 'unavailable' };
  let perm = await api.getPermissions();
  if (!perm.granted && askPermission && perm.canAskAgain) {
    const r = await api.requestPermissions();
    perm = { granted: r.granted, canAskAgain: false };
  }
  if (!perm.granted) {
    await cancelPeriodReminder(api, storage);
    return { status: 'denied', canAskAgain: perm.canAskAgain };
  }
  const sig = plan.date.toISOString();
  const present = (await api.getScheduledIds()).includes(PERIOD_REMINDER_ID);
  if (present && (await storage.get(PERIOD_REMINDER_SIGNATURE_KEY)) === sig) return { status: 'scheduled', at: sig, skipped: true };
  if (present) await api.cancel(PERIOD_REMINDER_ID);
  await api.scheduleAt(plan);
  await storage.set(PERIOD_REMINDER_SIGNATURE_KEY, sig);
  return { status: 'scheduled', at: sig, skipped: false };
}
