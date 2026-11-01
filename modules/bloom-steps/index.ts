import { requireOptionalNativeModule } from 'expo';

export interface DailySteps {
  /** YYYY-MM-DD in the device's timezone. */
  date: string;
  steps: number;
}

export interface BloomStepsNative {
  isAvailable(): Promise<boolean>;
  /** iOS never reveals a denied read, so true there only means the prompt was handled. */
  requestPermission(): Promise<boolean>;
  /** Dates with no readable data are left out. */
  getDailyTotals(dates: string[]): Promise<DailySteps[]>;
}

/** null in runtimes that do not ship the module, such as Expo Go. */
export const BloomSteps = requireOptionalNativeModule<BloomStepsNative>('BloomSteps');
