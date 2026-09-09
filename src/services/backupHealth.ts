/**
 * Keeping track of whether a backup exists and how old it is.
 *
 * This app has no server, so there is no silent sync to fall back on: a
 * person's data survives a lost phone only if they have exported it
 * somewhere. The app cannot do that for them, but it can stop the question
 * from being invisible.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_BACKUP_KEY = 'app_last_backup_at';
const REMINDER_KEY = 'app_backup_reminder_enabled';

/** Past this, the app starts saying the backup is old. */
export const STALE_AFTER_DAYS = 14;

export type BackupHealth = 'never' | 'fresh' | 'stale';

export interface BackupStatus {
  health: BackupHealth;
  /** ISO timestamp, or null when nothing has ever been exported. */
  lastBackupAt: string | null;
  /** Whole days since the last backup, or null when there has not been one. */
  ageDays: number | null;
}

export function assessBackup(lastBackupAt: string | null, now: Date = new Date()): BackupStatus {
  if (!lastBackupAt) return { health: 'never', lastBackupAt: null, ageDays: null };

  const then = new Date(lastBackupAt);
  if (Number.isNaN(then.getTime())) {
    // A corrupt timestamp should read as "no backup", not as a fresh one.
    return { health: 'never', lastBackupAt: null, ageDays: null };
  }

  const ageDays = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
  return {
    health: ageDays >= STALE_AFTER_DAYS ? 'stale' : 'fresh',
    lastBackupAt,
    ageDays
  };
}

export async function recordBackupTaken(when: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_BACKUP_KEY, when.toISOString());
  } catch {
    // The export itself succeeded; only the reminder loses accuracy.
  }
}

export async function getBackupStatus(now: Date = new Date()): Promise<BackupStatus> {
  try {
    return assessBackup(await AsyncStorage.getItem(LAST_BACKUP_KEY), now);
  } catch {
    return { health: 'never', lastBackupAt: null, ageDays: null };
  }
}

export async function isReminderEnabled(): Promise<boolean> {
  try {
    // On by default: someone who has never thought about backups is exactly
    // who needs the reminder.
    return (await AsyncStorage.getItem(REMINDER_KEY)) !== 'false';
  } catch {
    return true;
  }
}

export async function setReminderEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDER_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignored: the switch reverts on the next launch, nothing is lost.
  }
}

export async function clearBackupRecord(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_BACKUP_KEY);
  } catch {
    // Ignored.
  }
}
