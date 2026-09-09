import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { seedInitialData, restoreDefaultCategories as seedRestoreDefaultCategories } from './seed';
import { IDatabase } from './types';

let databaseInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<IDatabase> {
  if (databaseInstance) {
    return databaseInstance as unknown as IDatabase;
  }

  databaseInstance = await SQLite.openDatabaseAsync('hesab_finance.db');
  
  // Enable foreign keys
  await databaseInstance.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create schema
  await databaseInstance.execAsync(CREATE_TABLES_SQL);

  return databaseInstance as unknown as IDatabase;
}

export async function initDatabase(primaryCurrency: string = 'IQD'): Promise<IDatabase> {
  const db = await getDatabase();
  await seedInitialData(db, primaryCurrency);
  return db;
}

export async function restoreDefaultCategories(): Promise<void> {
  const db = await getDatabase();
  await seedRestoreDefaultCategories(db);
}

export async function resetAllDatabaseData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM shopping_items;
    DELETE FROM shopping_trips;
    DELETE FROM debts;
    DELETE FROM budgets;
    DELETE FROM transactions;
    DELETE FROM recurring_rules;
  `);
  // Ensure default categories and accounts are intact
  await seedRestoreDefaultCategories(db);
}
