import CryptoJS from 'crypto-js';

// Polyfill crypto.getRandomValues in React Native / Hermes where native crypto is absent
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.crypto) {
    g.crypto = {};
  }
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
      if (!array) return array;
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
}

// Fallback protection for CryptoJS WordArray.random
try {
  const originalRandom = (CryptoJS.lib.WordArray as any).random;
  (CryptoJS.lib.WordArray as any).random = function (nBytes: number) {
    try {
      if (typeof originalRandom === 'function') {
        return originalRandom.call(this, nBytes);
      }
    } catch {}
    const words: number[] = [];
    for (let i = 0; i < nBytes; i += 4) {
      words.push((Math.random() * 0x100000000) | 0);
    }
    return (CryptoJS.lib.WordArray as any).create(words, nBytes);
  };
} catch {}

/**
 * The backup file format, with no database behind it.
 *
 * Version 3 introduces AES-256 encrypted payload packaging (.dinaro format),
 * SHA-256 checksum integrity verification, and optional user password protection.
 * Legacy unencrypted formats (v1 and v2) remain fully supported for backward compatibility.
 */
export const BACKUP_FORMAT_VERSION = 3;

/**
 * Tables the app owns. Columns are read from the database at runtime rather
 * than listed here, so a schema change can never leave the backup writing a
 * stale column set.
 */
export const TABLES = [
  'accounts', 'categories', 'subcategories', 'transactions', 'debts', 'budgets',
  'reminders', 'savings_goals', 'shopping_trips', 'shopping_items', 'recurring_rules'
] as const;

/** Children before parents, so deletes never trip a foreign key. */
export const DELETE_ORDER = [
  'shopping_items', 'shopping_trips', 'savings_goals', 'reminders', 'recurring_rules',
  'debts', 'budgets', 'transactions', 'subcategories', 'categories', 'accounts'
];

/** Parents before children, so inserts always find their reference. */
export const INSERT_ORDER = [
  'accounts', 'categories', 'subcategories', 'transactions', 'budgets',
  'debts', 'reminders', 'savings_goals', 'shopping_trips', 'shopping_items', 'recurring_rules'
];

export interface BackupPayload {
  format: number;
  schema_version: number;
  app: 'dinaro' | 'hesab';
  exported_at: string;
  counts: Record<string, number>;
  data: Record<string, any[]>;
}

export interface SecureBackupContainer {
  magic: 'DINARO_SECURE_BACKUP';
  version: number;
  app: 'dinaro' | 'hesab';
  exported_at: string;
  isPasswordProtected: boolean;
  checksum: string;
  counts: Record<string, number>;
  payload: string; // AES-256 ciphertext
}

export type RestoreProblem =
  | 'unreadable'
  | 'not-a-hesab-backup'
  | 'from-newer-app'
  | 'write-failed'
  | 'password-required'
  | 'wrong-password'
  | 'checksum-mismatch';

export interface RestoreResult {
  ok: boolean;
  problem?: RestoreProblem;
  counts?: Record<string, number>;
  detail?: string;
  isPasswordProtected?: boolean;
}

const MASTER_SALT = 'DINARO_APP_ENCRYPTED_VAULT_SALT_v3';
const DEFAULT_KEY_SEED = 'DINARO_MASTER_KEY_SEED_SECURE_2026';

function deriveKey(password?: string): string {
  if (password && password.trim()) {
    return CryptoJS.PBKDF2(password.trim(), MASTER_SALT, { keySize: 256 / 32, iterations: 1000 }).toString();
  }
  return CryptoJS.PBKDF2(DEFAULT_KEY_SEED, MASTER_SALT, { keySize: 256 / 32, iterations: 500 }).toString();
}

/** Encrypts a BackupPayload into a SecureBackupContainer */
export function encryptBackup(payload: BackupPayload, password?: string): SecureBackupContainer {
  const jsonString = JSON.stringify(payload);
  const checksum = CryptoJS.SHA256(jsonString).toString();
  const key = deriveKey(password);
  const ciphertext = CryptoJS.AES.encrypt(jsonString, key).toString();

  return {
    magic: 'DINARO_SECURE_BACKUP',
    version: BACKUP_FORMAT_VERSION,
    app: 'dinaro',
    exported_at: payload.exported_at || new Date().toISOString(),
    isPasswordProtected: Boolean(password && password.trim()),
    checksum,
    counts: payload.counts,
    payload: ciphertext
  };
}

/** Decrypts a SecureBackupContainer */
export function decryptBackupContainer(
  container: SecureBackupContainer,
  password?: string
): { payloadString?: string; problem?: RestoreProblem } {
  if (container.isPasswordProtected && (!password || !password.trim())) {
    return { problem: 'password-required' };
  }

  try {
    const key = deriveKey(password);
    const bytes = CryptoJS.AES.decrypt(container.payload, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      return { problem: container.isPasswordProtected ? 'wrong-password' : 'unreadable' };
    }

    const calculatedChecksum = CryptoJS.SHA256(decrypted).toString();
    if (container.checksum && calculatedChecksum !== container.checksum) {
      return { problem: 'checksum-mismatch' };
    }

    return { payloadString: decrypted };
  } catch {
    return { problem: container.isPasswordProtected ? 'wrong-password' : 'unreadable' };
  }
}

/**
 * Parses and sanity-checks a backup file without touching the database.
 * Handles both encrypted .dinaro files and legacy .json files.
 */
export function parseBackup(
  content: string,
  supportedSchemaVersion = Number.MAX_SAFE_INTEGER,
  password?: string
): { payload?: BackupPayload; problem?: RestoreProblem; isPasswordProtected?: boolean } {
  let raw: any;
  try {
    raw = JSON.parse(content);
  } catch {
    return { problem: 'unreadable' };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { problem: 'not-a-hesab-backup' };
  }

  // 1. Encrypted container format (.dinaro)
  if (raw.magic === 'DINARO_SECURE_BACKUP') {
    if (raw.isPasswordProtected && (!password || !password.trim())) {
      return { problem: 'password-required', isPasswordProtected: true };
    }
    const dec = decryptBackupContainer(raw as SecureBackupContainer, password);
    if (!dec.payloadString) {
      return { problem: dec.problem, isPasswordProtected: raw.isPasswordProtected };
    }
    try {
      raw = JSON.parse(dec.payloadString);
    } catch {
      return { problem: 'unreadable' };
    }
  }

  // 2. Validate schema format (v1, v2 or decrypted v3)
  const isV1 = raw.version === 1 && Array.isArray(raw.accounts);
  const isV2 = (raw.format >= 2 || raw.version >= 2) && raw.data && typeof raw.data === 'object';
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
      format: isV1 ? 1 : raw.format ?? raw.version ?? 2,
      schema_version: isV1 ? 1 : raw.schema_version ?? 1,
      app: raw.app || 'dinaro',
      exported_at: raw.exported_at ?? '',
      counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
      data
    }
  };
}
