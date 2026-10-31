// Per-device, per-user choice of how each reminder alerts. Stored locally because sounds and alarm permissions belong to
// the device, and never sent to the server.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderKeySchema } from '@/types/api';
import type { ReminderMode, ReminderModes } from '@/notifications/scheduler';

const prefKey = (userId: string) => `bubu.reminderModes.${userId}`;
const MODES: readonly string[] = ['notification', 'alarm', 'loudAlarm'] satisfies ReminderMode[];

export async function getReminderModes(userId: string): Promise<ReminderModes> {
  try {
    const parsed: unknown = JSON.parse((await AsyncStorage.getItem(prefKey(userId))) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const out: ReminderModes = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = ReminderKeySchema.safeParse(k);
      if (key.success && typeof v === 'string' && MODES.includes(v)) out[key.data] = v as ReminderMode;
    }
    return out;
  } catch {
    return {};
  }
}

export async function setReminderModes(userId: string, modes: ReminderModes): Promise<void> {
  try {
    await AsyncStorage.setItem(prefKey(userId), JSON.stringify(modes));
  } catch {
    /* preference is best effort */
  }
}
