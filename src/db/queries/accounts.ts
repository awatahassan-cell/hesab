import { getDatabase } from '../index';
import { Account } from '../schema';

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Account>(
    'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC'
  );
}

export async function getArchivedAccounts(): Promise<Account[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Account>(
    'SELECT * FROM accounts WHERE is_archived = 1 ORDER BY sort_order ASC, created_at ASC'
  );
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
}

export async function createAccount(data: {
  name: string;
  type: Account['type'];
  icon: string;
  color: string;
  starting_balance: number;
  currency: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'acc_' + Date.now().toString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO accounts (id, name, type, icon, color, starting_balance, current_balance, currency, is_archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 99, ?)`,
    [id, data.name, data.type, data.icon, data.color, data.starting_balance, data.starting_balance, data.currency, now]
  );

  return id;
}

export async function updateAccount(
  id: string,
  data: Partial<Pick<Account, 'name' | 'type' | 'icon' | 'color' | 'currency'>>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function setAccountArchived(id: string, archived: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE accounts SET is_archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

export async function recalculateAccountBalance(accountId: string): Promise<number> {
  const db = await getDatabase();
  const acc = await getAccountById(accountId);
  if (!acc) return 0;

  const txs = await db.getAllAsync<{
    type: string;
    amount: number;
    currency: string;
    exchange_rate: number;
    account_id: string;
    to_account_id: string | null;
  }>(
    "SELECT type, amount, currency, exchange_rate, account_id, to_account_id FROM transactions WHERE account_id = ? OR to_account_id = ?",
    [accountId, accountId]
  );

  let newBalance = acc.starting_balance;
  for (const t of txs) {
    let amt = t.amount;
    if (t.currency && acc.currency && t.currency !== acc.currency) {
      const rate = t.exchange_rate || 1500;
      if (t.currency === 'USD' && acc.currency === 'IQD') {
        amt = t.amount * rate;
      } else if (t.currency === 'IQD' && acc.currency === 'USD') {
        amt = t.amount / rate;
      }
    }

    if (t.type === 'income' && t.account_id === accountId) {
      newBalance += amt;
    } else if (t.type === 'expense' && t.account_id === accountId) {
      newBalance -= amt;
    } else if (t.type === 'transfer') {
      if (t.account_id === accountId) newBalance -= amt;
      if (t.to_account_id === accountId) newBalance += amt;
    }
  }

  await db.runAsync('UPDATE accounts SET current_balance = ? WHERE id = ?', [newBalance, accountId]);
  return newBalance;
}
