import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { readPickedFile } from './pickedFile';
import { getDatabase } from '../db';
import { IDatabase } from '../db/types';
import { getSchemaVersion, LATEST_SCHEMA_VERSION } from '../db/migrations';
import {
  BACKUP_FORMAT_VERSION,
  TABLES,
  DELETE_ORDER,
  INSERT_ORDER,
  parseBackup,
  BackupPayload,
  RestoreProblem,
  RestoreResult
} from './backupFormat';

export {
  BACKUP_FORMAT_VERSION,
  TABLES,
  parseBackup
} from './backupFormat';
export type { BackupPayload, RestoreProblem, RestoreResult } from './backupFormat';

async function columnsOf(db: IDatabase, table: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

/**
 * Full backup and restore.
 *
 * Every table the app writes is listed here. The previous version covered
 * eight of the ten, so restoring a backup silently wiped reminders and savings
 * goals — the tables it did not know to save. Adding a table to the schema
 * means adding it to TABLES, and the round-trip test catches it if you forget.
 */
/** Reads every table into a plain object. */
export async function buildBackup(): Promise<BackupPayload> {
  const db = await getDatabase();
  const data: Record<string, any[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const rows = await db.getAllAsync<any>(`SELECT * FROM ${table}`);
    data[table] = rows;
    counts[table] = rows.length;
  }

  return {
    format: BACKUP_FORMAT_VERSION,
    schema_version: await getSchemaVersion(db),
    app: 'hesab',
    exported_at: new Date().toISOString(),
    counts,
    data
  };
}

function backupFileName(): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `hesab-backup-${stamp}.json`;
}

/**
 * Writes a backup file and hands it to the share sheet, so the person chooses
 * where it lands — Files, Drive, a chat to themselves.
 */
export async function exportBackup(): Promise<{ path: string; counts: Record<string, number> }> {
  const payload = await buildBackup();
  const path = `${FileSystem.documentDirectory}${backupFileName()}`;

  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Hesab backup',
      UTI: 'public.json'
    });
  }

  return { path, counts: payload.counts };
}

/**
 * Replaces the database contents with a backup.
 *
 * Wrapped in a single transaction: if any row fails to insert, the old data is
 * still there. The previous version deleted first and inserted after, outside
 * a transaction, so a bad file left the app empty.
 */
export async function restoreBackup(jsonString: string): Promise<RestoreResult> {
  const { payload, problem } = parseBackup(jsonString, LATEST_SCHEMA_VERSION);
  if (!payload) return { ok: false, problem };

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

/** Opens the file picker and restores whatever the person chooses. */
export async function pickAndRestoreBackup(): Promise<RestoreResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true
  });

  if (picked.canceled || !picked.assets?.length) {
    return { ok: false, problem: 'unreadable', detail: 'cancelled' };
  }

  try {
    const content = await readPickedFile(picked.assets[0]);
    return await restoreBackup(content);
  } catch (error) {
    return {
      ok: false,
      problem: 'unreadable',
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}
