/**
 * The backup file format, with no database behind it.
 *
 * Parsing and validation live here so they can be exercised directly — the
 * rules about which tables a file must carry are the part worth testing, and
 * they should not need SQLite to run.
 */
export const BACKUP_FORMAT_VERSION = 2;

/**
 * Tables the app owns. Columns are read from the database at runtime rather
 * than listed here, so a schema change can never leave the backup writing a
 * stale column set.
 */
export const TABLES = [
  'accounts', 'categories', 'subcategories', 'transactions', 'debts', 'budgets',
  'reminders', 'savings_goals', 'shopping_trips', 'shopping_items'
] as const;

/** Children before parents, so deletes never trip a foreign key. */
export const DELETE_ORDER = [
  'shopping_items', 'shopping_trips', 'savings_goals', 'reminders',
  'debts', 'budgets', 'transactions', 'subcategories', 'categories', 'accounts'
];

/** Parents before children, so inserts always find their reference. */
export const INSERT_ORDER = [
  'accounts', 'categories', 'subcategories', 'transactions', 'budgets',
  'debts', 'reminders', 'savings_goals', 'shopping_trips', 'shopping_items'
];

export interface BackupPayload {
  format: number;
  schema_version: number;
  app: 'hesab';
  exported_at: string;
  counts: Record<string, number>;
  data: Record<string, any[]>;
}

export type RestoreProblem =
  | 'unreadable'
  | 'not-a-hesab-backup'
  | 'from-newer-app'
  | 'write-failed';

export interface RestoreResult {
  ok: boolean;
  problem?: RestoreProblem;
  counts?: Record<string, number>;
  detail?: string;
}

/**
 * Parses and sanity-checks a backup without touching the database.
 *
 * `supportedSchemaVersion` is passed in rather than imported, so this module
 * stays free of database dependencies.
 */
export function parseBackup(
  jsonString: string,
  supportedSchemaVersion = Number.MAX_SAFE_INTEGER
): { payload?: BackupPayload; problem?: RestoreProblem } {
  let raw: any;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    return { problem: 'unreadable' };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { problem: 'not-a-hesab-backup' };
  }

  // Format 1 files had the tables at the top level and no `data` wrapper.
  const isV1 = raw.version === 1 && Array.isArray(raw.accounts);
  const isV2 = raw.format >= 2 && raw.data && typeof raw.data === 'object';
  if (!isV1 && !isV2) return { problem: 'not-a-hesab-backup' };

  if (isV2 && typeof raw.schema_version === 'number' && raw.schema_version > supportedSchemaVersion) {
    return { problem: 'from-newer-app' };
  }

  const data: Record<string, any[]> = {};
  for (const table of TABLES) {
    const camel = table.replace(/_([a-z])/g, (_m: string, c: string) => c.toUpperCase());
    const source = isV1 ? raw[table] ?? raw[camel] : raw.data[table];
    data[table] = Array.isArray(source) ? source : [];
  }

  return {
    payload: {
      format: isV1 ? 1 : raw.format,
      schema_version: isV1 ? 1 : raw.schema_version ?? 1,
      app: 'hesab',
      exported_at: raw.exported_at ?? '',
      counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
      data
    }
  };
}
