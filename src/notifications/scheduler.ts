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
}
