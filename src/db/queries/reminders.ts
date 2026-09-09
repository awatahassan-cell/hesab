import { getDatabase } from '../index';
import { Reminder } from '../schema';
import { createTransaction } from './transactions';
import i18n from '../../i18n';

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const reminders = await db.getAllAsync<Reminder>('SELECT * FROM reminders ORDER BY due_day ASC');
  return reminders || [];
}

export async function createReminder(data: {
  title: string;
  amount: number;
  currency?: string;
  due_day: number;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  category_id?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'rem_' + Date.now().toString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO reminders (id, title, amount, currency, due_day, frequency, category_id, is_paid, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      data.title,
      data.amount,
      data.currency || 'IQD',
      data.due_day || 1,
      data.frequency || 'monthly',
      data.category_id || null,
      now
    ]
  );

  return id;
}

export async function updateReminder(
  id: string,
  data: Partial<Pick<Reminder, 'title' | 'amount' | 'currency' | 'due_day' | 'is_paid' | 'last_paid_date'>>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
  if (data.due_day !== undefined) { fields.push('due_day = ?'); values.push(data.due_day); }
  if (data.is_paid !== undefined) { fields.push('is_paid = ?'); values.push(data.is_paid); }
  if (data.last_paid_date !== undefined) { fields.push('last_paid_date = ?'); values.push(data.last_paid_date); }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}

/**
 * Marks reminder as paid and logs it as an expense transaction!
 */
export async function payReminderAndLogExpense(
  reminder: Reminder,
  accountId: string = 'acc_savings'
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // 1. Create expense transaction
  await createTransaction({
    type: 'expense',
    amount: reminder.amount,
    currency: reminder.currency,
    account_id: accountId,
    category_id: reminder.category_id || undefined,
    date_time: now,
    note: `${i18n.t('home.reminders')}: ${reminder.title}`
  });

  // 2. Mark reminder as paid
  await db.runAsync(
    'UPDATE reminders SET is_paid = 1, last_paid_date = ? WHERE id = ?',
    [now, reminder.id]
  );
}

export async function toggleReminderPaidStatus(id: string, currentPaid: number): Promise<void> {
  const db = await getDatabase();
  const newStatus = currentPaid ? 0 : 1;
  const lastPaid = newStatus ? new Date().toISOString() : null;
  await db.runAsync('UPDATE reminders SET is_paid = ?, last_paid_date = ? WHERE id = ?', [newStatus, lastPaid, id]);
}
