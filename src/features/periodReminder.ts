// Local-only opt-in for the "period may start soon" reminder (never sent to the server, generic notification text).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { expoNotifApi } from '@/notifications/expoAdapter';
import { syncPeriodReminder, type PeriodReminderResult, type Storage } from '@/notifications/scheduler';

const prefKey = (userId: string) => `bubu.periodReminder.${userId}`;
export const reminderStorage: Storage = {
  get: (k) => AsyncStorage.getItem('bubu.' + k),
  set: (k, v) => (v === null ? AsyncStorage.removeItem('bubu.' + k) : AsyncStorage.setItem('bubu.' + k, v)),
};

export async function getPeriodReminderPref(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(prefKey(userId))) === '1';
  } catch {
    return false;
  }
}
export async function setPeriodReminderPref(userId: string, on: boolean): Promise<void> {
  try {
    if (on) await AsyncStorage.setItem(prefKey(userId), '1');
    else await AsyncStorage.removeItem(prefKey(userId));
  } catch {
    /* preference is best effort */
  }
}

/** Applies the preference + current estimate to the OS scheduler; never throws (Expo Go has no native notifications module). */
export async function applyPeriodReminder(args: { enabled: boolean; nextStart: string | null; askPermission: boolean }): Promise<PeriodReminderResult | null> {
  try {
    return await syncPeriodReminder({ api: expoNotifApi, storage: reminderStorage, ...args });
  } catch {
    return null;
  }
}

export function reminderNote(r: PeriodReminderResult | null, enabled: boolean): string | null {
  if (!enabled) return null;
  if (!r) return 'Reminders are not available right now.';
  switch (r.status) {
    case 'scheduled':
      return 'Reminder set for two days before the estimate.';
    case 'nothing_to_schedule':
      return 'Nothing to schedule yet. A reminder is set once an estimate is ready.';
    case 'denied':
      return 'Notifications are turned off or unavailable here (for example in Expo Go).';
    case 'unavailable':
      return 'Reminders are unavailable in this app version.';
    default:
      return null;
  }
}
