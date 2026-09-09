import { getDatabase } from '../index';
import { Debt } from '../schema';
import { createTransaction } from './transactions';

export async function getAllDebts(type?: 'lent' | 'borrowed'): Promise<Debt[]> {
  const db = await getDatabase();
  const query = type
    ? `SELECT d.*, a.name as account_name FROM debts d 
       LEFT JOIN accounts a ON d.account_id = a.id 
       WHERE d.type = ? ORDER BY d.is_settled ASC, d.date DESC`
    : `SELECT d.*, a.name as account_name FROM debts d 
       LEFT JOIN accounts a ON d.account_id = a.id 
       ORDER BY d.is_settled ASC, d.date DESC`;
  const params = type ? [type] : [];
  return await db.getAllAsync<Debt>(query, params);
}

export async function createDebt(data: {
  type: 'lent' | 'borrowed';
  person_name: string;
  amount: number;
  currency: string;
  account_id: string;
  date: string;
  note?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'debt_' + Date.now().toString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO debts (id, type, person_name, amount, currency, account_id, date, note, is_settled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, data.type, data.person_name, data.amount, data.currency, data.account_id, data.date, data.note || null, now]
  );

  // When lending money out, it decreases account balance immediately (as expense)
  // When borrowing money, it increases account balance (as income)
  if (data.type === 'lent') {
    await createTransaction({
      type: 'expense',
      amount: data.amount,
      currency: data.currency,
      account_id: data.account_id,
      date_time: data.date,
      note: `Lent to ${data.person_name}`
    });
  } else {
    await createTransaction({
      type: 'income',
      amount: data.amount,
      currency: data.currency,
      account_id: data.account_id,
      date_time: data.date,
      note: `Borrowed from ${data.person_name}`
    });
  }

  return id;
}

export async function settleDebt(debtId: string, accountId?: string): Promise<void> {
  const db = await getDatabase();
  const debt = await db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ?', [debtId]);
  if (!debt || debt.is_settled) return;

  const targetAccount = accountId || debt.account_id;
  const now = new Date().toISOString();

  // If debt was 'lent', receiving it back is income to the account
  // If debt was 'borrowed', paying it back is expense from the account
  const txId = await createTransaction({
    type: debt.type === 'lent' ? 'income' : 'expense',
    amount: debt.amount,
    currency: debt.currency,
    account_id: targetAccount,
    date_time: now,
    note: debt.type === 'lent' ? `Settled debt from ${debt.person_name}` : `Repaid debt to ${debt.person_name}`
  });

  await db.runAsync(
    'UPDATE debts SET is_settled = 1, settled_date = ?, settled_transaction_id = ? WHERE id = ?',
    [now, txId, debtId]
  );
}

export async function deleteDebt(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
}

export async function getDebtTotals(): Promise<{ lentPending: number; borrowedPending: number }> {
  const db = await getDatabase();
  const lent = await db.getFirstAsync<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM debts WHERE type = 'lent' AND is_settled = 0"
  );
  const borrowed = await db.getFirstAsync<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM debts WHERE type = 'borrowed' AND is_settled = 0"
  );

  return {
    lentPending: lent?.sum || 0,
    borrowedPending: borrowed?.sum || 0
  };
}
