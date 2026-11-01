// Per-user, per-device choice to fill the Steps habit from the phone's health data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BloomSteps, type DailySteps } from '../../modules/bloom-steps';

const prefKey = (userId: string) => `bubu.autoSteps.${userId}`;

export async function getAutoStepsPref(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(prefKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function setAutoStepsPref(userId: string, on: boolean): Promise<void> {
  try {
    if (on) await AsyncStorage.setItem(prefKey(userId), '1');
    else await AsyncStorage.removeItem(prefKey(userId));
  } catch {
    /* preference is best effort */
  }
}

export async function deviceStepsAvailable(): Promise<boolean> {
  try {
    return (await BloomSteps?.isAvailable()) ?? false;
  } catch {
    return false;
  }
}

export async function requestDeviceSteps(): Promise<boolean> {
  try {
    return (await BloomSteps?.requestPermission()) ?? false;
  } catch {
    return false;
  }
}

export async function readDeviceSteps(dates: string[]): Promise<DailySteps[]> {
  try {
    return (await BloomSteps?.getDailyTotals(dates)) ?? [];
  } catch {
    return [];
  }
}
