import { Platform } from 'react-native';
import type { NotifApi, OneOffReminder, PlannedReminder } from './scheduler';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'reminders';
// Android freezes a channel's sound and importance once created, so alarms need their own channel.
const ALARM_CHANNEL_ID = 'alarms';
const ALARM_SOUND = 'alarm.wav';

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
    handleNotification: async (n) => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: n.request.content.data?.mode === 'alarm', shouldSetBadge: false }),
  });
}

async function ensureAlarmChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: 'Alarms',
    importance: N.AndroidImportance.MAX,
    sound: ALARM_SOUND,
    vibrationPattern: [0, 500, 250, 500],
    // Not the ALARM usage: this mode must stay quiet in silent mode. Loud alarm is the one that rings through it.
    audioAttributes: { usage: N.AndroidAudioUsage.NOTIFICATION_EVENT, contentType: N.AndroidAudioContentType.SONIFICATION },
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
    const alarm = p.mode === 'alarm';
    if (alarm) await ensureAlarmChannel(N);
    else if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, { name: 'Reminders', importance: N.AndroidImportance.DEFAULT });
    }
    await N.scheduleNotificationAsync({
      identifier: p.identifier,
      content: alarm ? { title: p.title, body: p.body, sound: ALARM_SOUND, data: { mode: 'alarm' } } : { title: p.title, body: p.body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: p.hour,
        minute: p.minute,
        channelId: alarm ? ALARM_CHANNEL_ID : CHANNEL_ID,
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
