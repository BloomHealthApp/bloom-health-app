import { requireOptionalNativeModule } from 'expo';

export type AlarmAvailability = 'granted' | 'needsPermission' | 'denied' | 'unavailable';

export interface BloomAlarmInput {
  id: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

export interface BloomAlarmNative {
  getAvailability(): Promise<AlarmAvailability>;
  requestPermission(): Promise<void>;
  canUseFullScreen(): Promise<boolean>;
  openFullScreenSettings(): Promise<void>;
  getScheduledIds(): Promise<string[]>;
  schedule(alarm: BloomAlarmInput): Promise<void>;
  cancel(id: string): Promise<void>;
}

/** null in runtimes that do not ship the module, such as Expo Go. */
export const BloomAlarm = requireOptionalNativeModule<BloomAlarmNative>('BloomAlarm');
