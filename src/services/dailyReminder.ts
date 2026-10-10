import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelDailyReminder,
  scheduleDailyReminder
} from './notifications';

export const DAILY_REMINDER_ENABLED_KEY = 'app_daily_reminder_enabled';
export const DAILY_REMINDER_TIME_KEY = 'app_daily_reminder_time'; // "HH:mm"
export const DEFAULT_DAILY_REMINDER_TIME = '21:00'; // 09:00 PM

export interface DailyReminderConfig {
  enabled: boolean;
  time: string; // "HH:mm"
  hour: number;
  minute: number;
}

export function parseReminderTime(timeStr?: string | null): { hour: number; minute: number } {
  if (!timeStr || !timeStr.includes(':')) {
    return { hour: 21, minute: 0 };
  }
  const parts = timeStr.split(':');
  const hour = Math.min(Math.max(parseInt(parts[0], 10) || 0, 0), 23);
  const minute = Math.min(Math.max(parseInt(parts[1], 10) || 0, 0), 59);
  return { hour, minute };
}

export function formatTimeDisplay(hour: number, minute: number): string {
  const padH = hour < 10 ? `0${hour}` : `${hour}`;
  const padM = minute < 10 ? `0${minute}` : `${minute}`;
  return `${padH}:${padM}`;
}

export function formatTime12h(hour: number, minute: number): { time12: string; ampm: string } {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const padM = minute < 10 ? `0${minute}` : `${minute}`;
  return { time12: `${h12}:${padM}`, ampm };
}

export async function getDailyReminderConfig(): Promise<DailyReminderConfig> {
  try {
    const [enabledVal, timeVal] = await Promise.all([
      AsyncStorage.getItem(DAILY_REMINDER_ENABLED_KEY),
      AsyncStorage.getItem(DAILY_REMINDER_TIME_KEY)
    ]);
    const enabled = enabledVal === 'true';
    const time = timeVal || DEFAULT_DAILY_REMINDER_TIME;
    const { hour, minute } = parseReminderTime(time);
    return { enabled, time, hour, minute };
  } catch {
    return { enabled: false, time: DEFAULT_DAILY_REMINDER_TIME, hour: 21, minute: 0 };
  }
}

export async function saveDailyReminderConfig(
  enabled: boolean,
  time: string,
  title: string,
  body: string
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(DAILY_REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
    await AsyncStorage.setItem(DAILY_REMINDER_TIME_KEY, time);

    if (enabled) {
      const { hour, minute } = parseReminderTime(time);
      return await scheduleDailyReminder(hour, minute, title, body);
    } else {
      await cancelDailyReminder();
      return true;
    }
  } catch {
    return false;
  }
}
