import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readPickedFile } from './pickedFile';
import { getDatabase } from '../db';
import { IDatabase } from '../db/types';
import { getSchemaVersion, LATEST_SCHEMA_VERSION } from '../db/migrations';
import { recordBackupTaken } from '../services/backupHealth';
import {
  BACKUP_FORMAT_VERSION,
  TABLES,
  DELETE_ORDER,
  INSERT_ORDER,
  parseBackup,
  encryptBackup,
  BackupPayload,
  SecureBackupContainer,
  RestoreProblem,
  RestoreResult
} from './backupFormat';

export {
  BACKUP_FORMAT_VERSION,
  TABLES,
  parseBackup,
  encryptBackup
} from './backupFormat';
export type {
  BackupPayload,
  SecureBackupContainer,
  RestoreProblem,
  RestoreResult
} from './backupFormat';

async function columnsOf(db: IDatabase, table: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

/** Reads every table into a clean payload object. */
export async function buildBackup(): Promise<BackupPayload> {
  const db = await getDatabase();
  const data: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    try {
      const rows = await db.getAllAsync<any>(`SELECT * FROM ${table}`);
      data[table] = rows;
      counts[table] = rows.length;
    } catch (err) {
      console.warn(`[backup] Error reading table ${table}:`, err);
      data[table] = [];
      counts[table] = 0;
    }
  }

  return {
    format: BACKUP_FORMAT_VERSION,
    schema_version: await getSchemaVersion(db),
    app: 'dinaro',
    exported_at: new Date().toISOString(),
    counts,
    data
  };
}

function backupFileName(): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `dinaro-backup-${stamp}.dinaro`;
}

/**
 * Creates an AES-256 encrypted .dinaro backup file and shares or downloads it.
 * If password is provided, payload is encrypted with user's custom password.
 */
export async function exportBackup(
  password?: string
): Promise<{ path: string; counts: Record<string, number>; isPasswordProtected: boolean }> {
  const payload = await buildBackup();
  const secureContainer = encryptBackup(payload, password);
  const fileName = backupFileName();
  const fileContent = JSON.stringify(secureContainer, null, 2);

  // Web download handling
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([fileContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    await recordBackupTaken();
    await AsyncStorage.setItem('app_last_backup_date', new Date().toISOString());
    return { path: fileName, counts: payload.counts, isPasswordProtected: Boolean(password && password.trim()) };
  }

  // Native FileSystem & Sharing
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('Device storage unavailable');
  }
  const path = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(path, fileContent, {
    encoding: FileSystem.EncodingType.UTF8
  });

  // Keep a persistent copy in document directory if different from cache
  if (FileSystem.documentDirectory && FileSystem.documentDirectory !== baseDir) {
    try {
      await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${fileName}`, fileContent, {
        encoding: FileSystem.EncodingType.UTF8
      });
    } catch {
      // Non-fatal
    }
  }

  if (await Sharing.isAvailableAsync()) {
    try {
      await Sharing.shareAsync(path, {
        mimeType: '*/*',
        dialogTitle: 'Dinaro Secure Backup',
        UTI: 'public.data'
      });
    } catch (shareErr) {
      console.warn('[backup] Sharing dismissed or unavailable:', shareErr);
    }
  }

  await recordBackupTaken();
  await AsyncStorage.setItem('app_last_backup_date', new Date().toISOString());
  return { path, counts: payload.counts, isPasswordProtected: Boolean(password && password.trim()) };
}

/**
 * Inspects a backup without touching the database.
 * Returns parsed payload or problem flag, and whether a password is required.
 */
export function inspectBackup(
  content: string,
  password?: string
): { payload?: BackupPayload; problem?: RestoreProblem; isPasswordProtected?: boolean } {
  return parseBackup(content, LATEST_SCHEMA_VERSION, password);
}

/**
 * Replaces the database contents with a backup.
 * Supports encrypted .dinaro files and legacy .json files.
 * Wrapped in a single transaction for atomicity.
 */
export async function restoreBackup(
  content: string,
  password?: string
): Promise<RestoreResult> {
  const { payload, problem, isPasswordProtected } = parseBackup(
    content,
    LATEST_SCHEMA_VERSION,
    password
  );
  if (!payload) return { ok: false, problem, isPasswordProtected };

  const db = await getDatabase();

  await db.execAsync('BEGIN');
  try {
    for (const table of DELETE_ORDER) {
      await db.execAsync(`DELETE FROM ${table};`);
    }

    for (const table of INSERT_ORDER) {
      const rows = payload.data[table] ?? [];
      if (rows.length === 0) continue;
      const columns = await columnsOf(db, table);

      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        await db.runAsync(
          sql,
          columns.map((c) => (row[c] === undefined ? null : row[c]))
        );
      }
    }

    await db.execAsync('COMMIT');
    await AsyncStorage.setItem('app_last_restore_date', new Date().toISOString());
    return { ok: true, counts: payload.counts };
  } catch (error) {
    await db.execAsync('ROLLBACK').catch(() => {});
    return {
      ok: false,
      problem: 'write-failed',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

/** Opens the system document picker and returns the file content */
export async function pickBackupFile(): Promise<{
  content?: string;
  name?: string;
  cancelled?: boolean;
  problem?: RestoreProblem;
}> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['*/*', 'application/json', 'application/octet-stream', 'text/plain'],
    copyToCacheDirectory: true
  });

  if (picked.canceled || !picked.assets?.length) {
    return { cancelled: true };
  }

  try {
    const asset = picked.assets[0];
    const content = await readPickedFile(asset);
    return { content, name: asset.name || undefined };
  } catch (error) {
    return {
      problem: 'unreadable'
    };
  }
}

/** Opens the file picker and restores the backup. Handles password if provided. */
export async function pickAndRestoreBackup(password?: string): Promise<RestoreResult> {
  const pick = await pickBackupFile();
  if (pick.cancelled) {
    return { ok: false, problem: 'unreadable', detail: 'cancelled' };
  }
  if (!pick.content) {
    return { ok: false, problem: pick.problem || 'unreadable' };
  }

  return await restoreBackup(pick.content, password);
}
