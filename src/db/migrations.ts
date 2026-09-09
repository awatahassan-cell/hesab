import { IDatabase } from './types';
import { CREATE_TABLES_SQL } from './schema';
import { roundMoney } from '../utils/money';

/**
 * Schema versioning.
 *
 * SQLite carries a `user_version` integer in the database header. It starts at
 * 0, which is also what every install shipped before this file had — so
 * migration 1 is written to be safe on a database that already has the tables.
 *
 * Rules for adding a migration:
 *   - Append, never edit a released one. Someone has already run it.
 *   - Bump LATEST_SCHEMA_VERSION to match.
 *   - Assume the database may be several versions behind; they run in order.
 */
export const LATEST_SCHEMA_VERSION = 5;

interface Migration {
  version: number;
  name: string;
  up: (db: IDatabase) => Promise<void>;
}

/** Columns every table is expected to have, so an older install can catch up. */
const EXPECTED_COLUMNS: Record<string, Record<string, string>> = {
  accounts: {
    is_archived: 'INTEGER NOT NULL DEFAULT 0',
    sort_order: 'INTEGER NOT NULL DEFAULT 0',
    currency: "TEXT NOT NULL DEFAULT 'IQD'"
  },
  transactions: {
    exchange_rate: 'REAL NOT NULL DEFAULT 1',
    subcategory_id: 'TEXT',
    receipt_uri: 'TEXT',
    recurring_id: 'TEXT'
  },
  reminders: {
    frequency: "TEXT NOT NULL DEFAULT 'monthly'",
    last_paid_date: 'TEXT',
    category_id: 'TEXT'
  },
  savings_goals: {
    target_date: 'TEXT',
    is_completed: 'INTEGER NOT NULL DEFAULT 0'
  },
  shopping_trips: {
    reminder_at: 'TEXT'
  }
};

/** Money columns, so a migration can normalise them per row currency. */
const MONEY_COLUMNS: { table: string; columns: string[] }[] = [
  { table: 'accounts', columns: ['starting_balance', 'current_balance'] },
  { table: 'transactions', columns: ['amount'] },
  { table: 'debts', columns: ['amount'] },
  { table: 'budgets', columns: ['amount'] },
  { table: 'reminders', columns: ['amount'] },
  { table: 'savings_goals', columns: ['target_amount', 'current_amount'] },
  { table: 'shopping_items', columns: ['price'] }
];

async function tableExists(db: IDatabase, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [table]
  );
  return !!row;
}

async function columnNames(db: IDatabase, table: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'baseline schema',
    // Runs on a fresh install and on every pre-versioning install alike:
    // CREATE TABLE IF NOT EXISTS is a no-op where the table is already there.
    up: async (db) => {
      await db.execAsync(CREATE_TABLES_SQL);
    }
  },
  {
    version: 2,
    name: 'backfill columns added after the first release',
    up: async (db) => {
      for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
        if (!(await tableExists(db, table))) continue;
        const existing = await columnNames(db, table);
        for (const [column, definition] of Object.entries(columns)) {
          if (existing.includes(column)) continue;
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
        }
      }
    }
  },
  {
    version: 3,
    name: 'normalise stored amounts to currency precision',
    up: async (db) => {
      for (const { table, columns } of MONEY_COLUMNS) {
        if (!(await tableExists(db, table))) continue;
        const present = await columnNames(db, table);
        const cols = columns.filter((c) => present.includes(c));
        if (cols.length === 0) continue;

        const hasCurrency = present.includes('currency');
        const select = ['id', ...(hasCurrency ? ['currency'] : []), ...cols].join(', ');
        const rows = await db.getAllAsync<Record<string, any>>(`SELECT ${select} FROM ${table}`);

        for (const row of rows) {
          const currency = hasCurrency ? row.currency : 'IQD';
          const changed: string[] = [];
          const values: any[] = [];

          for (const c of cols) {
            const before = Number(row[c] ?? 0);
            const after = roundMoney(before, currency);
            if (after !== before) {
              changed.push(`${c} = ?`);
              values.push(after);
            }
          }

          if (changed.length > 0) {
            values.push(row.id);
            await db.runAsync(
              `UPDATE ${table} SET ${changed.join(', ')} WHERE id = ?`,
              values
            );
          }
        }
      }
    }
  },
  {
    version: 4,
    name: 'shopping list reminders',
    up: async (db) => {
      if (!(await tableExists(db, 'shopping_trips'))) return;
      const existing = await columnNames(db, 'shopping_trips');
      if (!existing.includes('reminder_at')) {
        await db.execAsync('ALTER TABLE shopping_trips ADD COLUMN reminder_at TEXT;');
      }
    }
  },
  {
    version: 5,
    name: 'recurring transaction rules',
    up: async (db) => {
      // This table was referenced by the "delete all data" routine but never
      // created, so a wipe threw "no such table" on a real device.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurring_rules (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL,
          account_id TEXT NOT NULL,
          to_account_id TEXT,
          category_id TEXT,
          subcategory_id TEXT,
          note TEXT,
          frequency TEXT NOT NULL DEFAULT 'monthly',
          interval_count INTEGER NOT NULL DEFAULT 1,
          start_date TEXT NOT NULL,
          next_run TEXT NOT NULL,
          last_run TEXT,
          end_date TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_rules(next_run);
      `);
    }
  }
];

export interface MigrationResult {
  from: number;
  to: number;
  applied: string[];
}

/**
 * Brings the database up to LATEST_SCHEMA_VERSION.
 *
 * Each step runs inside its own transaction together with the version bump, so
 * an interrupted upgrade leaves the database on the last version that fully
 * succeeded rather than half-migrated.
 */
export async function runMigrations(db: IDatabase): Promise<MigrationResult> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  const applied: string[] = [];

  if (from > LATEST_SCHEMA_VERSION) {
    // The app was downgraded. Reading a newer schema with older code risks
    // writing bad rows, so stop rather than guess.
    throw new Error(
      `Database schema v${from} is newer than this app supports (v${LATEST_SCHEMA_VERSION}). Please update the app.`
    );
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= from) continue;

    await db.execAsync('BEGIN');
    try {
      await migration.up(db);
      // Not parameterised: PRAGMA does not accept bindings. The value is a
      // literal from the list above, never user input.
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      await db.execAsync('COMMIT');
      applied.push(`${migration.version}:${migration.name}`);
    } catch (error) {
      await db.execAsync('ROLLBACK').catch(() => {});
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return { from, to: LATEST_SCHEMA_VERSION, applied };
}

export async function getSchemaVersion(db: IDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}
