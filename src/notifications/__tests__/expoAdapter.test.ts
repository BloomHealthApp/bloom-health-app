import * as N from 'expo-notifications';
import { configureNotifications, expoNotifApi } from '../expoAdapter';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3, MAX: 5 },
  AndroidAudioUsage: { NOTIFICATION_EVENT: 10 },
  AndroidAudioContentType: { SONIFICATION: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => null),
  deleteNotificationChannelAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  setNotificationHandler: jest.fn(),
}));

const scheduled = () => (N.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
const reminder = { identifier: 'bubu.reminder.water', key: 'water', title: 'Bloom Health', body: 'Hi', hour: 9, minute: 0 };

beforeEach(() => jest.clearAllMocks());

describe('notification sounds', () => {
  it('gives a normal reminder the notification sound on the new channel and removes the old one', async () => {
    await expoNotifApi.schedule({ ...reminder, mode: 'notification' } as never);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith('reminders_sound', expect.objectContaining({ sound: 'notification.wav' }));
    expect(N.deleteNotificationChannelAsync).toHaveBeenCalledWith('reminders');
    expect(scheduled().content.sound).toBe('notification.wav');
    expect(scheduled().trigger.channelId).toBe('reminders_sound');
  });
  it('gives a one-off reminder the notification sound', async () => {
    await expoNotifApi.scheduleAt!({ identifier: 'x', title: 'Bloom Health', body: 'Hi', date: new Date(2030, 0, 1) });
    expect(scheduled().content.sound).toBe('notification.wav');
    expect(scheduled().trigger.channelId).toBe('reminders_sound');
  });
  it('keeps the alarm tone for alarm mode', async () => {
    await expoNotifApi.schedule({ ...reminder, mode: 'alarm' } as never);
    expect(scheduled().content.sound).toBe('alarm.wav');
    expect(scheduled().trigger.channelId).toBe('alarms');
  });
  it('plays the sound while the app is open', async () => {
    configureNotifications();
    const { handleNotification } = (N.setNotificationHandler as jest.Mock).mock.calls[0][0];
    expect(await handleNotification({ request: { content: { data: {} } } })).toMatchObject({ shouldPlaySound: true });
  });
});
