import { getDatabase } from '../index';
import { ShoppingTrip, ShoppingItem } from '../schema';
import { createTransaction } from './transactions';

export async function getAllShoppingTrips(status?: 'list' | 'completed'): Promise<ShoppingTrip[]> {
  const db = await getDatabase();
  const query = status
    ? `SELECT t.*, a.name as account_name FROM shopping_trips t
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE t.status = ? ORDER BY t.date_time DESC`
    : `SELECT t.*, a.name as account_name FROM shopping_trips t
       LEFT JOIN accounts a ON t.account_id = a.id
       ORDER BY t.status ASC, t.date_time DESC`;
  const params = status ? [status] : [];
  const trips = await db.getAllAsync<ShoppingTrip>(query, params);

  // Fetch items for each trip
  for (const trip of trips) {
    trip.items = await db.getAllAsync<ShoppingItem>(
      'SELECT * FROM shopping_items WHERE trip_id = ? ORDER BY is_checked ASC',
      [trip.id]
    );
  }

  return trips;
}

export async function createShoppingTrip(data: {
  store_name: string;
  account_id: string;
  date_time?: string;
  currency?: string;
  status?: 'list' | 'completed';
  receipt_uri?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'trip_' + Date.now().toString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO shopping_trips (id, store_name, date_time, account_id, total_amount, currency, status, receipt_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.store_name,
      data.date_time || now,
      data.account_id,
      0,
      data.currency || 'IQD',
      data.status || 'list',
      data.receipt_uri || null,
      now
    ]
  );

  return id;
}

export async function addShoppingItem(tripId: string, item: { name: string; price: number; quantity?: number }): Promise<string> {
  const db = await getDatabase();
  const id = 'sitem_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4);

  await db.runAsync(
    `INSERT INTO shopping_items (id, trip_id, name, price, quantity, is_checked)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, tripId, item.name, item.price || 0, item.quantity || 1, 0]
  );

  await recalculateTripTotal(tripId);
  return id;
}

export async function toggleShoppingItem(itemId: string, isChecked: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE shopping_items SET is_checked = ? WHERE id = ?', [isChecked ? 1 : 0, itemId]);
}

export async function deleteShoppingItem(itemId: string, tripId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [itemId]);
  await recalculateTripTotal(tripId);
}

export async function recalculateTripTotal(tripId: string): Promise<number> {
  const db = await getDatabase();
  const res = await db.getFirstAsync<{ sum: number }>(
    'SELECT COALESCE(SUM(price * quantity), 0) as sum FROM shopping_items WHERE trip_id = ?',
    [tripId]
  );
  const total = res?.sum || 0;
  await db.runAsync('UPDATE shopping_trips SET total_amount = ? WHERE id = ?', [total, tripId]);
  return total;
}

export async function convertShoppingListToExpense(tripId: string): Promise<string | null> {
  const db = await getDatabase();
  const trip = await db.getFirstAsync<ShoppingTrip>('SELECT * FROM shopping_trips WHERE id = ?', [tripId]);
  if (!trip || trip.total_amount <= 0) return null;

  const now = new Date().toISOString();

  // Create single completed expense transaction
  const txId = await createTransaction({
    type: 'expense',
    amount: trip.total_amount,
    currency: trip.currency,
    account_id: trip.account_id,
    date_time: now,
    note: `Shopping: ${trip.store_name}`,
    receipt_uri: trip.receipt_uri || undefined
  });

  await db.runAsync(
    'UPDATE shopping_trips SET status = ?, transaction_id = ? WHERE id = ?',
    ['completed', txId, tripId]
  );

  return txId;
}

export async function deleteShoppingTrip(tripId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_trips WHERE id = ?', [tripId]);
}
