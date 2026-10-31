import type { Reminder } from '@/types/api';
import { DEFAULT_REMINDERS } from '@/lib/defaults';
import { buildPlan, cancelAllReminders, syncReminders, type AlarmApi, type LoudAlarmAvailability, type NotifApi, type PlannedReminder, type Storage } from '../scheduler';

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

describe('reminder modes', () => {
  function loud(opts: { availability?: LoudAlarmAvailability; grantOnRequest?: boolean; failSchedule?: boolean } = {}) {
    const scheduled = new Map<string, PlannedReminder>();
    let availability = opts.availability ?? 'granted';
    const calls = { schedule: 0, request: 0 };
    const alarmApi: AlarmApi = {
      getAvailability: async () => availability,
      requestPermission: async () => {
        calls.request++;
        if (opts.grantOnRequest) availability = 'granted';
      },
      getScheduledIds: async () => [...scheduled.keys()],
      schedule: async (p) => {
        calls.schedule++;
        if (opts.failSchedule) throw new Error('exact alarm permission revoked');
        scheduled.set(p.identifier, p);
      },
      cancel: async (id) => void scheduled.delete(id),
    };
    return { alarmApi, scheduled, calls };
  }
  const WAKE = 'bubu.reminder.wakeUp';
  const base = (f: ReturnType<typeof fakes>) => ({ api: f.api, storage: f.storage, reminders: rem(), timezone: 'UTC', askPermission: false });

  it('defaults to notification, and adding modes to the app does not reschedule existing users', async () => {
    const f = fakes();
    const { alarmApi, scheduled } = loud();
    await syncReminders(base(f));
    expect(f.scheduled.get(WAKE)?.mode).toBe('notification');
    const before = f.calls.schedule;
    const r = await syncReminders({ ...base(f), modes: {}, alarmApi });
    expect(r).toEqual({ status: 'scheduled', count: 5, skipped: true });
    expect(f.calls.schedule).toBe(before);
    expect(scheduled.size).toBe(0);
  });
  it('changing to alarm reschedules once, without duplicates', async () => {
    const f = fakes();
    await syncReminders(base(f));
    const before = f.calls.schedule;
    await syncReminders({ ...base(f), modes: { wakeUp: 'alarm' } });
    expect(f.scheduled.get(WAKE)?.mode).toBe('alarm');
    expect(f.scheduled.size).toBe(5);
    expect(f.calls.schedule).toBe(before + 5);
    expect(await syncReminders({ ...base(f), modes: { wakeUp: 'alarm' } })).toMatchObject({ skipped: true });
  });
  it('switching systems cancels the old entry, so a reminder never fires twice', async () => {
    const f = fakes();
    const l = loud();
    await syncReminders(base(f));
    await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi });
    expect(l.scheduled.has(WAKE)).toBe(true);
    expect(f.scheduled.has(WAKE)).toBe(false);
    expect(await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi })).toMatchObject({ skipped: true });
    await syncReminders({ ...base(f), modes: { wakeUp: 'notification' }, alarmApi: l.alarmApi });
    expect(l.scheduled.has(WAKE)).toBe(false);
    expect(f.scheduled.has(WAKE)).toBe(true);
  });
  it.each(['unavailable', 'denied', 'needsPermission'] as const)('falls back to the alarm tone and reports it when loud alarms are %s', async (availability) => {
    const f = fakes();
    const l = loud({ availability });
    const r = await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi });
    expect(r).toMatchObject({ status: 'scheduled', loudAlarmFallback: availability });
    expect(f.scheduled.get(WAKE)?.mode).toBe('alarm');
    expect(l.scheduled.size).toBe(0);
    expect(await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi })).toMatchObject({ skipped: true, loudAlarmFallback: availability });
  });
  it('falls back without any native module', async () => {
    const f = fakes();
    expect(await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' } })).toMatchObject({ loudAlarmFallback: 'unavailable' });
    expect(f.scheduled.get(WAKE)?.mode).toBe('alarm');
  });
  it('asks for alarm permission only when told to, then upgrades to the loud alarm', async () => {
    const f = fakes();
    const l = loud({ availability: 'needsPermission', grantOnRequest: true });
    await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi, askPermission: true });
    expect(l.calls.request).toBe(0);
    const r = await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi, askAlarmPermission: true });
    expect(l.calls.request).toBe(1);
    expect(r).not.toHaveProperty('loudAlarmFallback');
    expect(l.scheduled.has(WAKE)).toBe(true);
    expect(f.scheduled.has(WAKE)).toBe(false);
  });
  it('a native scheduling failure still leaves an alarm that sounds', async () => {
    const f = fakes();
    const l = loud({ failSchedule: true });
    const r = await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi });
    expect(r).toMatchObject({ status: 'scheduled', count: 5, loudAlarmFallback: 'unavailable' });
    expect(f.scheduled.get(WAKE)?.mode).toBe('alarm');
  });
  it('denied notifications and turning a reminder off also cancel its loud alarm', async () => {
    const f = fakes();
    const l = loud();
    const modes = { wakeUp: 'loudAlarm' } as const;
    await syncReminders({ ...base(f), modes, alarmApi: l.alarmApi });
    await syncReminders({ ...base(f), reminders: rem([{ enabled: false }]), modes, alarmApi: l.alarmApi });
    expect(l.scheduled.size).toBe(0);
    await syncReminders({ ...base(f), modes, alarmApi: l.alarmApi });
    const denied = fakes({ granted: false, canAskAgain: false });
    await syncReminders({ ...base(denied), modes, alarmApi: l.alarmApi });
    expect(l.scheduled.size).toBe(0);
  });
  it('a volume change reschedules only a loud alarm, clamped to an audible level', async () => {
    const f = fakes();
    const l = loud();
    const modes = { wakeUp: 'loudAlarm', hydration: 'alarm' } as const;
    await syncReminders({ ...base(f), modes, alarmApi: l.alarmApi });
    expect(l.scheduled.get(WAKE)?.volume).toBe(1);
    await syncReminders({ ...base(f), modes, volumes: { wakeUp: 0.01 }, alarmApi: l.alarmApi });
    expect(l.scheduled.get(WAKE)?.volume).toBe(0.1);
    expect(await syncReminders({ ...base(f), modes, volumes: { wakeUp: 0.01, hydration: 0.5 }, alarmApi: l.alarmApi })).toMatchObject({ skipped: true });
  });
  it('sign-out clears both systems', async () => {
    const f = fakes();
    const l = loud();
    await syncReminders({ ...base(f), modes: { wakeUp: 'loudAlarm' }, alarmApi: l.alarmApi });
    await cancelAllReminders(f.api, f.storage, l.alarmApi);
    expect(f.scheduled.size).toBe(0);
    expect(l.scheduled.size).toBe(0);
  });
});

describe('period heads-up reminder', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sched = require('../scheduler') as typeof import('../scheduler');
  const NOW = new Date(2026, 9, 10, 8, 0, 0); // Oct 10 2026, 08:00 local

  function fakes2(opts: { granted?: boolean; canAskAgain?: boolean; noDateTriggers?: boolean } = {}) {
    const f = fakes(opts);
    const at: import('../scheduler').OneOffReminder[] = [];
    if (!opts.noDateTriggers) {
      f.api.scheduleAt = async (p) => {
        at.push(p);
        f.scheduled.set(p.identifier, p as never);
      };
    }
    return { ...f, at };
  }

  it('plans two days before the estimate at 09:00, never in the past, nothing without an estimate', () => {
    const p = sched.planPeriodReminder('2026-10-21', NOW)!;
    expect(p.date.getFullYear()).toBe(2026);
    expect([p.date.getMonth(), p.date.getDate(), p.date.getHours()]).toEqual([9, 19, 9]);
    expect(sched.planPeriodReminder('2026-10-11', NOW)).toBeNull();
    expect(sched.planPeriodReminder(null, NOW)).toBeNull();
  });

  it('uses generic text: the word period never appears in the notification', () => {
    const p = sched.planPeriodReminder('2026-10-21', NOW)!;
    expect(`${p.title} ${p.body}`.toLowerCase()).not.toMatch(/period|cycle|menstru/);
  });

  it('schedules once, is idempotent, reschedules when the estimate moves and cancels when turned off', async () => {
    const { api, storage, at, scheduled } = fakes2();
    const args = { api, storage, enabled: true, askPermission: false, now: NOW };
    expect(await sched.syncPeriodReminder({ ...args, nextStart: '2026-10-21' })).toMatchObject({ status: 'scheduled', skipped: false });
    expect(await sched.syncPeriodReminder({ ...args, nextStart: '2026-10-21' })).toMatchObject({ status: 'scheduled', skipped: true });
    expect(at).toHaveLength(1);
    expect(await sched.syncPeriodReminder({ ...args, nextStart: '2026-10-25' })).toMatchObject({ status: 'scheduled', skipped: false });
    expect(at).toHaveLength(2);
    expect(scheduled.has(sched.PERIOD_REMINDER_ID)).toBe(true);
    expect(await sched.syncPeriodReminder({ ...args, enabled: false, nextStart: '2026-10-25' })).toEqual({ status: 'off' });
    expect(scheduled.has(sched.PERIOD_REMINDER_ID)).toBe(false);
  });

  it('does not touch the daily reminders (separate identifier prefix)', async () => {
    const { api, storage, scheduled } = fakes2();
    await syncReminders({ api, storage, reminders: rem(), timezone: 'UTC', askPermission: false });
    const before = [...scheduled.keys()].sort();
    await sched.syncPeriodReminder({ api, storage, enabled: true, nextStart: '2026-10-21', askPermission: false, now: NOW });
    await syncReminders({ api, storage, reminders: rem(), timezone: 'UTC', askPermission: false });
    expect([...scheduled.keys()].filter((k) => k !== sched.PERIOD_REMINDER_ID).sort()).toEqual(before);
    expect(scheduled.has(sched.PERIOD_REMINDER_ID)).toBe(true);
  });

  it('degrades gracefully: denied permission, runtimes without date triggers (Expo Go), no estimate', async () => {
    const denied = fakes2({ granted: false, canAskAgain: false });
    expect(await sched.syncPeriodReminder({ api: denied.api, storage: denied.storage, enabled: true, nextStart: '2026-10-21', askPermission: true, now: NOW })).toEqual({ status: 'denied', canAskAgain: false });
    const noTriggers = fakes2({ noDateTriggers: true });
    expect(await sched.syncPeriodReminder({ api: noTriggers.api, storage: noTriggers.storage, enabled: true, nextStart: '2026-10-21', askPermission: true, now: NOW })).toEqual({ status: 'unavailable' });
    const none = fakes2();
    expect(await sched.syncPeriodReminder({ api: none.api, storage: none.storage, enabled: true, nextStart: null, askPermission: true, now: NOW })).toEqual({ status: 'nothing_to_schedule' });
  });

  it('asks for permission only on an explicit user action', async () => {
    const a = fakes2({ granted: false, canAskAgain: true });
    await sched.syncPeriodReminder({ api: a.api, storage: a.storage, enabled: true, nextStart: '2026-10-21', askPermission: false, now: NOW });
    expect(a.calls.request).toBe(0);
    const b = fakes2({ granted: false, canAskAgain: true });
    (b.api as { requestPermissions: () => Promise<{ granted: boolean }> }).requestPermissions = async () => ({ granted: true });
    const r = await sched.syncPeriodReminder({ api: b.api, storage: b.storage, enabled: true, nextStart: '2026-10-21', askPermission: true, now: NOW });
    expect(r.status).toBe('scheduled');
  });

  it('cancelAllReminders (sign-out) also removes the period reminder', async () => {
    const { api, storage, scheduled } = fakes2();
    await sched.syncPeriodReminder({ api, storage, enabled: true, nextStart: '2026-10-21', askPermission: false, now: NOW });
    await cancelAllReminders(api, storage);
    expect(scheduled.has(sched.PERIOD_REMINDER_ID)).toBe(false);
  });
});
