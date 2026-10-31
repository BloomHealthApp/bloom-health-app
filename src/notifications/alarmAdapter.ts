import { BloomAlarm, type BloomAlarmNative } from '../../modules/bloom-alarm';
import type { AlarmApi, PlannedReminder } from './scheduler';

/** Connects Loud alarm to the native module. Undefined where the module is missing, such as Expo Go. */
export const nativeAlarmApi: AlarmApi | undefined = BloomAlarm ? createAlarmApi(BloomAlarm) : undefined;

function createAlarmApi(native: BloomAlarmNative): AlarmApi {
  return {
    getAvailability: () => native.getAvailability(),
    requestPermission: () => native.requestPermission(),
    getScheduledIds: () => native.getScheduledIds(),
    schedule: ({ identifier, hour, minute, title, body }: PlannedReminder) => native.schedule({ id: identifier, hour, minute, title, body }),
    cancel: (identifier) => native.cancel(identifier),
  };
}

export async function canShowFullScreenAlarm(): Promise<boolean> {
  return (await BloomAlarm?.canUseFullScreen()) ?? true;
}

export async function openFullScreenAlarmSettings(): Promise<void> {
  await BloomAlarm?.openFullScreenSettings();
}
