import { getDatabase } from '../index';
import { Transaction } from '../schema';
import { recalculateAccountBalance } from './accounts';

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'expense' | 'income' | 'transfer';
  searchQuery?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const db = await getDatabase();
  const conditions: string[] = ['1=1'];
  const params: any[] = [];

  if (filters.startDate) {
    conditions.push('t.date_time >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('t.date_time <= ?');
    params.push(filters.endDate);
  }
  if (filters.accountId) {
    conditions.push('(t.account_id = ? OR t.to_account_id = ?)');
    params.push(filters.accountId, filters.accountId);
  }
  if (filters.categoryId) {
    conditions.push('t.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.type) {
    conditions.push('t.type = ?');
    params.push(filters.type);
  }
  if (filters.minAmount !== undefined) {
    conditions.push('t.amount >= ?');
    params.push(filters.minAmount);
  }
  if (filters.maxAmount !== undefined) {
    conditions.push('t.amount <= ?');
    params.push(filters.maxAmount);
  }
  if (filters.searchQuery) {
    conditions.push('(t.note LIKE ? OR c.custom_name LIKE ?)');
    params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
  }

  const limitClause = filters.limit ? `LIMIT ${filters.limit} OFFSET ${filters.offset || 0}` : '';

  const query = `
    SELECT 
      t.*,
      a.name as account_name,
      a2.name as to_account_name,
      c.name_key as category_name_key,
      c.custom_name as category_custom_name,
      c.icon as category_icon,
      c.color as category_color,
      s.name_key as subcategory_name_key,
      s.custom_name as subcategory_custom_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts a2 ON t.to_account_id = a2.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN subcategories s ON t.subcategory_id = s.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.date_time DESC, t.created_at DESC
    ${limitClause}
  `;

  return await db.getAllAsync<Transaction>(query, params);
}

export async function createTransaction(data: {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  currency: string;
  exchange_rate?: number;
  account_id: string;
  to_account_id?: string;
  category_id?: string;
  subcategory_id?: string;
  date_time: string;
  note?: string;
  receipt_uri?: string;
  recurring_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'tx_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4);
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (
      id, type, amount, currency, exchange_rate, account_id, to_account_id,
      category_id, subcategory_id, date_time, note, receipt_uri, recurring_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.type,
      data.amount,
      data.currency,
      data.exchange_rate || 1,
      data.account_id,
      data.to_account_id || null,
      data.category_id || null,
      data.subcategory_id || null,
      data.date_time,
      data.note || null,
      data.receipt_uri || null,
      data.recurring_id || null,
      now
    ]
  );

  // Recalculate balances immediately
  await recalculateAccountBalance(data.account_id);
  if (data.to_account_id) {
    await recalculateAccountBalance(data.to_account_id);
  }

  return id;
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, 'id' | 'created_at'>>
): Promise<void> {
  const db = await getDatabase();
  const current = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!current) return;

  const fields: string[] = [];
  const values: any[] = [];

  const assignable = [
    'type', 'amount', 'currency', 'exchange_rate', 'account_id', 'to_account_id',
    'category_id', 'subcategory_id', 'date_time', 'note', 'receipt_uri'
  ] as const;

  for (const field of assignable) {
    const val = (data as any)[field];
    if (val !== undefined) {
      fields.push(`${field} = ?`);
      values.push(val ?? null);
    }
  }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);

  // Recalculate affected accounts
  await recalculateAccountBalance(current.account_id);
  if (current.to_account_id) await recalculateAccountBalance(current.to_account_id);
  if (data.account_id && data.account_id !== current.account_id) {
    await recalculateAccountBalance(data.account_id);
  }
  if (data.to_account_id && data.to_account_id !== current.to_account_id) {
    await recalculateAccountBalance(data.to_account_id);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase();
  const current = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!current) return;

  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

  await recalculateAccountBalance(current.account_id);
  if (current.to_account_id) {
    await recalculateAccountBalance(current.to_account_id);
  }
}

export async function getTotalsForPeriod(startDate: string, endDate: string): Promise<{ income: number; expense: number }> {
  const db = await getDatabase();
  const inc = await db.getFirstAsync<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'income' AND date_time >= ? AND date_time <= ?",
    [startDate, endDate]
  );
  const exp = await db.getFirstAsync<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'expense' AND date_time >= ? AND date_time <= ?",
    [startDate, endDate]
  );

  return {
    income: inc?.sum || 0,
    expense: exp?.sum || 0
  };
}

export async function getCategorySpendingForPeriod(startDate: string, endDate: string): Promise<Array<{
  category_id: string;
  category_name_key: string;
  category_custom_name?: string;
  icon: string;
  color: string;
  total_amount: number;
  percentage: number;
}>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    category_id: string;
    category_name_key: string;
    category_custom_name: string | null;
    icon: string;
    color: string;
    total_amount: number;
  }>(
    `SELECT 
       t.category_id,
       c.name_key as category_name_key,
       c.custom_name as category_custom_name,
       c.icon,
       c.color,
       SUM(t.amount) as total_amount
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'expense' AND t.date_time >= ? AND t.date_time <= ?
     GROUP BY t.category_id
     ORDER BY total_amount DESC`,
    [startDate, endDate]
  );

  const grandTotal = rows.reduce((acc, r) => acc + r.total_amount, 0);

  return rows.map((r) => ({
    category_id: r.category_id,
    category_name_key: r.category_name_key,
    category_custom_name: r.category_custom_name || undefined,
    icon: r.icon,
    color: r.color,
    total_amount: r.total_amount,
    percentage: grandTotal > 0 ? Math.round((r.total_amount / grandTotal) * 1000) / 10 : 0
  }));
}

export async function getTopExpenses(limit: number = 10, startDate?: string, endDate?: string): Promise<Transaction[]> {
  return await getTransactions({
    type: 'expense',
    startDate,
    endDate,
    limit
  });
}
