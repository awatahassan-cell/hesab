/**
 * Turning a parsed CSV into rows in the database.
 *
 * Import adds to what is there — it never replaces, unlike restoring a
 * backup. Someone bringing three years of history from another app should
 * not lose what they have already entered here.
 */
import * as DocumentPicker from 'expo-document-picker';

import { ParsedRow } from '../utils/csvImport';
import { readPickedFile } from '../utils/pickedFile';
import { createTransaction } from '../db/queries/transactions';
import { getAllCategories } from '../db/queries/categories';
import { Category } from '../db/schema';

export interface PickedFile {
  name: string;
  content: string;
}

/** Returns null when the picker was dismissed. */
export async function pickCsvFile(): Promise<PickedFile | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
    copyToCacheDirectory: true
  });

  if (picked.canceled || !picked.assets?.length) return null;

  const asset = picked.assets[0];
  const content = await readPickedFile(asset);
  return { name: asset.name ?? 'import.csv', content };
}

/**
 * Matches an imported category name against one that already exists.
 *
 * Both the translated name and the underlying key are checked, so a file
 * exported from this app in Kurdish imports correctly into an English one.
 */
export function matchCategory(
  name: string | undefined,
  categories: Category[],
  translate: (key: string) => string
): string | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;

  const hit = categories.find((c) => {
    if (c.custom_name && c.custom_name.trim().toLowerCase() === needle) return true;
    if (c.name_key.toLowerCase() === needle) return true;
    return translate(`categories.names.${c.name_key}`).trim().toLowerCase() === needle;
  });

  return hit?.id;
}

export interface ImportOutcome {
  imported: number;
  failed: number;
}

/**
 * Writes the rows.
 *
 * Every row lands on the account chosen in the screen: a CSV names accounts
 * as free text, and inventing accounts from unrecognised names would leave a
 * mess that is harder to undo than to redo.
 */
export async function importRows(
  rows: ParsedRow[],
  options: { accountId: string; currency: string; translate: (key: string) => string }
): Promise<ImportOutcome> {
  const categories = await getAllCategories();
  let imported = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await createTransaction({
        // Transfers need a second account the file does not identify, so they
        // come in as plain expenses rather than being dropped.
        type: row.type === 'transfer' ? 'expense' : row.type,
        amount: row.amount,
        currency: options.currency,
        account_id: options.accountId,
        category_id:
          row.type === 'transfer'
            ? undefined
            : matchCategory(row.category, categories, options.translate),
        date_time: row.date,
        note: row.note
      });
      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, failed };
}
