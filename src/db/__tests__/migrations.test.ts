jest.mock('expo-sqlite', () => ({}));

import { runMigrations, getSchemaVersion, LATEST_SCHEMA_VERSION } from '../migrations';
import { IDatabase } from '../types';

/**
 * A database stand-in that records the SQL it is given.
 *
 * The point is the runner's contract — order, transactions, the version bump —
 * not SQLite's behaviour, which is not ours to test.
 */
function fakeDb(startVersion: number, failOnVersion?: number) {
  const log: string[] = [];
  let version = startVersion;

  const db: IDatabase = {
    async execAsync(sql: string) {
      log.push(sql.trim());
      const bump = sql.match(/PRAGMA user_version = (\d+)/);
      if (bump) {
        if (failOnVersion !== undefined && Number(bump[1]) === failOnVersion) {
          throw new Error('boom');
        }
        version = Number(bump[1]);
      }
    },
    async runAsync(sql: string) {
      log.push(sql.trim());
      return {};
    },
    async getAllAsync<T>(sql: string): Promise<T[]> {
      log.push(sql.trim());
      // Every table reports the columns the migrations look for, so nothing
      // is added twice and no row-level work is triggered.
      if (sql.includes('table_info')) {
        return [
          { name: 'id' }, { name: 'currency' }, { name: 'is_archived' },
          { name: 'sort_order' }, { name: 'exchange_rate' }, { name: 'subcategory_id' },
          { name: 'receipt_uri' }, { name: 'recurring_id' }, { name: 'frequency' },
          { name: 'last_paid_date' }, { name: 'category_id' }, { name: 'target_date' },
          { name: 'is_completed' }, { name: 'reminder_at' }
        ] as unknown as T[];
      }
      return [] as T[];
    },
    async getFirstAsync<T>(sql: string): Promise<T | null> {
      if (sql.includes('user_version')) return { user_version: version } as unknown as T;
      if (sql.includes('sqlite_master')) return { name: 'present' } as unknown as T;
      return null;
    }
  };

  return { db, log, version: () => version };
}

describe('runMigrations', () => {
  it('takes a fresh database to the latest version', async () => {
    const { db, version } = fakeDb(0);
    const result = await runMigrations(db);

    expect(result.from).toBe(0);
    expect(result.to).toBe(LATEST_SCHEMA_VERSION);
    expect(version()).toBe(LATEST_SCHEMA_VERSION);
    expect(result.applied).toHaveLength(LATEST_SCHEMA_VERSION);
  });

  it('runs steps in ascending order', async () => {
    const { db, log } = fakeDb(0);
    await runMigrations(db);

    const bumps = log
      .filter((sql) => sql.includes('PRAGMA user_version ='))
      .map((sql) => Number(sql.match(/= (\d+)/)![1]));

    expect(bumps).toEqual([...bumps].sort((a, b) => a - b));
    expect(bumps[bumps.length - 1]).toBe(LATEST_SCHEMA_VERSION);
  });

  it('skips versions the database already has', async () => {
    const { db } = fakeDb(LATEST_SCHEMA_VERSION - 1);
    const result = await runMigrations(db);

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]).toContain(String(LATEST_SCHEMA_VERSION));
  });

  it('does nothing when already up to date', async () => {
    const { db, log } = fakeDb(LATEST_SCHEMA_VERSION);
    const result = await runMigrations(db);

    expect(result.applied).toEqual([]);
    expect(log.filter((sql) => sql === 'BEGIN')).toHaveLength(0);
  });

  it('wraps every step in a transaction', async () => {
    const { db, log } = fakeDb(0);
    await runMigrations(db);

    const begins = log.filter((sql) => sql === 'BEGIN').length;
    const commits = log.filter((sql) => sql === 'COMMIT').length;
    expect(begins).toBe(LATEST_SCHEMA_VERSION);
    expect(commits).toBe(begins);
  });

  it('rolls back and stops at the last good version when a step fails', async () => {
    // The guarantee that matters on an upgrade: a half-applied migration must
    // not leave the schema claiming a version it did not reach.
    const { db, log, version } = fakeDb(0, 3);

    await expect(runMigrations(db)).rejects.toThrow(/Migration 3/);
    expect(log).toContain('ROLLBACK');
    expect(version()).toBe(2);
  });

  it('refuses a database from a newer app rather than guessing', async () => {
    const { db } = fakeDb(LATEST_SCHEMA_VERSION + 5);
    await expect(runMigrations(db)).rejects.toThrow(/newer than this app supports/);
  });

  it('reports the stored version', async () => {
    const { db } = fakeDb(2);
    expect(await getSchemaVersion(db)).toBe(2);
  });
});
