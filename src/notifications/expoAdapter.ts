import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotifApi, PlannedReminder } from './scheduler';

const CHANNEL_ID = 'reminders';

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export const expoNotifApi: NotifApi = {
  async getPermissions() {
    const p = await Notifications.getPermissionsAsync();
    return { granted: p.granted, canAskAgain: p.canAskAgain };
  },
  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const p = await Notifications.requestPermissionsAsync();
    return { granted: p.granted };
  },
  async getScheduledIds() {
    return (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);
  },
  async schedule(p: PlannedReminder) {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
    }
    await Notifications.scheduleNotificationAsync({
      identifier: p.identifier,
      content: { title: p.title, body: p.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: p.hour,
        minute: p.minute,
        channelId: CHANNEL_ID,
      },
    });
  },
  async cancel(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },
};
