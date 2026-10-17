import { Platform } from 'react-native';
import type { NotifApi, OneOffReminder, PlannedReminder } from './scheduler';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'reminders';

let cached: NotificationsModule | null | undefined;

/**
 * expo-notifications needs native code that some runtimes (e.g. an Expo Go build that is older than the
 * installed package) do not ship. Importing it eagerly would crash the whole app at startup, so it is
 * loaded lazily and reminders are simply unavailable when the native module is missing.
 */
function notifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('[notifications] expo-notifications is unavailable in this runtime; reminders are disabled.', e);
    cached = null;
  }
  return cached;
}

export function configureNotifications() {
  const N = notifications();
  if (!N) return;
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export const expoNotifApi: NotifApi = {
  async getPermissions() {
    const N = notifications();
    if (!N) return { granted: false, canAskAgain: false };
    const p = await N.getPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  },
  async requestPermissions() {
    const N = notifications();
    if (!N) return { granted: false };
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Reminders',
        importance: N.AndroidImportance.DEFAULT,
      });
    }
    const p = await N.requestPermissionsAsync();
    return { granted: p.granted };
  },
  async getScheduledIds() {
    const N = notifications();
    if (!N) return [];
    return (await N.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
  },
  async schedule(p: PlannedReminder) {
    const N = notifications();
    if (!N) return;
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, { name: 'Reminders', importance: N.AndroidImportance.DEFAULT });
    }
    await N.scheduleNotificationAsync({
      identifier: p.identifier,
      content: { title: p.title, body: p.body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: p.hour,
        minute: p.minute,
        channelId: CHANNEL_ID,
      },
    });
  },
  async scheduleAt(p: OneOffReminder) {
    const N = notifications();
    if (!N) return;
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, { name: 'Reminders', importance: N.AndroidImportance.DEFAULT });
    }
    await N.scheduleNotificationAsync({
      identifier: p.identifier,
      content: { title: p.title, body: p.body },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL_ID },
    });
  },
  async cancel(identifier: string) {
    const N = notifications();
    if (!N) return;
    await N.cancelScheduledNotificationAsync(identifier);
  },
};
