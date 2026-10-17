import type { Reminder } from '@/types/api';
import { DEFAULT_REMINDERS } from '@/lib/defaults';
import { buildPlan, cancelAllReminders, syncReminders, type NotifApi, type PlannedReminder, type Storage } from '../scheduler';

function fakes(opts: { granted?: boolean; canAskAgain?: boolean; grantOnRequest?: boolean } = {}) {
  const scheduled = new Map<string, PlannedReminder>();
  let granted = opts.granted ?? true;
  const calls = { schedule: 0, cancel: 0, request: 0 };
  const api: NotifApi = {
    getPermissions: async () => ({ granted, canAskAgain: opts.canAskAgain ?? true }),
    requestPermissions: async () => {
      calls.request++;
      granted = opts.grantOnRequest ?? false;
      return { granted };
    },
    getScheduledIds: async () => [...scheduled.keys(), 'someone.elses.notification'],
    schedule: async (p) => {
      calls.schedule++;
      scheduled.set(p.identifier, p); // same identifier replaces, like expo-notifications
    },
    cancel: async (id) => {
      calls.cancel++;
      scheduled.delete(id);
    },
  };
  const mem = new Map<string, string>();
  const storage: Storage = { get: async (k) => mem.get(k) ?? null, set: async (k, v) => void (v === null ? mem.delete(k) : mem.set(k, v)) };
  return { api, storage, scheduled, calls };
}

const rem = (over: Partial<Reminder>[] = []): Reminder[] => DEFAULT_REMINDERS.map((r, i) => ({ ...r, ...(over[i] ?? {}) }));

describe('buildPlan', () => {
  it('skips disabled/invalid reminders and de-dupes by key', () => {
    const plan = buildPlan([
      { key: 'wakeUp', enabled: true, time: '05:00' },
      { key: 'wakeUp', enabled: true, time: '06:00' },
      { key: 'hydration', enabled: false, time: '11:00' },
      { key: 'bedtime', enabled: true, time: '25:99' },
    ]);
    expect(plan.map((p) => p.identifier)).toEqual(['bubu.reminder.wakeUp']);
    expect(plan[0]).toMatchObject({ hour: 5, minute: 0 });
  });
});

describe('syncReminders', () => {
  it('schedules all enabled reminders once; re-running does not duplicate or reschedule', async () => {
    const f = fakes();
    const args = { api: f.api, storage: f.storage, reminders: rem(), timezone: 'Asia/Kolkata', askPermission: false };
    const r1 = await syncReminders(args);
    expect(r1).toEqual({ status: 'scheduled', count: 5, skipped: false });
    const r2 = await syncReminders(args);
    expect(r2).toMatchObject({ status: 'scheduled', skipped: true });
    expect(f.scheduled.size).toBe(5);
    expect(f.calls.schedule).toBe(5);
  });
  it('changing a time replaces (never duplicates) and untouched foreign notifications are left alone', async () => {
    const f = fakes();
    const base = { api: f.api, storage: f.storage, timezone: 'UTC', askPermission: false };
    await syncReminders({ ...base, reminders: rem() });
    await syncReminders({ ...base, reminders: rem([{ time: '06:15' }]) });
    expect(f.scheduled.size).toBe(5);
    expect(f.scheduled.get('bubu.reminder.wakeUp')).toMatchObject({ hour: 6, minute: 15 });
    expect(f.scheduled.has('someone.elses.notification')).toBe(false); // never created by us
  });
  it('disabling a reminder cancels it', async () => {
    const f = fakes();
    const base = { api: f.api, storage: f.storage, timezone: 'UTC', askPermission: false };
    await syncReminders({ ...base, reminders: rem() });
    await syncReminders({ ...base, reminders: rem([{ enabled: false }]) });
    expect(f.scheduled.has('bubu.reminder.wakeUp')).toBe(false);
    expect(f.scheduled.size).toBe(4);
  });
  it('timezone change reschedules once', async () => {
    const f = fakes();
    const base = { api: f.api, storage: f.storage, reminders: rem(), askPermission: false };
    await syncReminders({ ...base, timezone: 'Asia/Kolkata' });
    const before = f.calls.schedule;
    const r = await syncReminders({ ...base, timezone: 'America/New_York' });
    expect(r).toMatchObject({ skipped: false });
    expect(f.calls.schedule).toBe(before + 5);
    expect(f.scheduled.size).toBe(5);
  });
  it('permission denied: nothing scheduled, reports canAskAgain, prompt only when asked', async () => {
    const f = fakes({ granted: false, canAskAgain: true, grantOnRequest: false });
    const noAsk = await syncReminders({ api: f.api, storage: f.storage, reminders: rem(), timezone: 'UTC', askPermission: false });
    expect(noAsk).toEqual({ status: 'denied', canAskAgain: true });
    expect(f.calls.request).toBe(0);
    const ask = await syncReminders({ api: f.api, storage: f.storage, reminders: rem(), timezone: 'UTC', askPermission: true });
    expect(f.calls.request).toBe(1);
    expect(ask).toMatchObject({ status: 'denied' });
    expect(f.scheduled.size).toBe(0);
  });
  it('permission granted after prompt schedules', async () => {
    const f = fakes({ granted: false, canAskAgain: true, grantOnRequest: true });
    const r = await syncReminders({ api: f.api, storage: f.storage, reminders: rem(), timezone: 'UTC', askPermission: true });
    expect(r).toMatchObject({ status: 'scheduled', count: 5 });
  });
  it('cancelAllReminders clears ours only', async () => {
    const f = fakes();
    await syncReminders({ api: f.api, storage: f.storage, reminders: rem(), timezone: 'UTC', askPermission: false });
    await cancelAllReminders(f.api, f.storage);
    expect(f.scheduled.size).toBe(0);
  });
});
