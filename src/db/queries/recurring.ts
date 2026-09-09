import { getDatabase } from '../index';
import { RecurringRule } from '../schema';
import { Frequency, dueOccurrences, firstRun } from '../../utils/recurrence';
import { createTransaction } from './transactions';

export async function getAllRecurringRules(): Promise<RecurringRule[]> {
  const db = await getDatabase();
  return await db.getAllAsync<RecurringRule>(
    `SELECT r.*,
            a.name  AS account_name,
            c.name_key AS category_name_key,
            c.custom_name AS category_custom_name,
            c.icon  AS category_icon,
            c.color AS category_color
       FROM recurring_rules r
       LEFT JOIN accounts a ON r.account_id = a.id
       LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.is_active DESC, r.next_run ASC`
  );
}

export async function createRecurringRule(data: {
  type: RecurringRule['type'];
  amount: number;
  currency: string;
  account_id: string;
  to_account_id?: string;
  category_id?: string;
  subcategory_id?: string;
  note?: string;
  frequency: Frequency;
  interval_count?: number;
  start_date: string;
  end_date?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'rec_' + Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
  const now = new Date().toISOString();

  // The rule's first posting is its start date. A rule created today for the
  // 1st of next month therefore posts nothing today.
  const next = firstRun(new Date(data.start_date)).toISOString();

  await db.runAsync(
    `INSERT INTO recurring_rules (
       id, type, amount, currency, account_id, to_account_id, category_id, subcategory_id,
       note, frequency, interval_count, start_date, next_run, last_run, end_date, is_active, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.type,
      data.amount,
      data.currency,
      data.account_id,
      data.to_account_id || null,
      data.category_id || null,
      data.subcategory_id || null,
      data.note || null,
      data.frequency,
      Math.max(1, Math.round(data.interval_count ?? 1)),
      data.start_date,
      next,
      null,
      data.end_date || null,
      1,
      now
    ]
  );

  return id;
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE recurring_rules SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
}

export interface RecurringRunResult {
  /** How many transactions were posted. */
  created: number;
  /** Rules that reached their end date and were switched off. */
  finished: number;
}

/**
 * Posts every transaction that has fallen due since the last run.
 *
 * Called once at startup. The phone is the only clock this app has, so a rule
 * catches up when the app is next opened rather than firing on time — which
 * is the honest behaviour for something with no server behind it.
 */
export async function runDueRecurringRules(now: Date = new Date()): Promise<RecurringRunResult> {
  const db = await getDatabase();
  const rules = await getAllRecurringRules();
  let created = 0;
  let finished = 0;

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const result = dueOccurrences(
      {
        frequency: rule.frequency,
        interval_count: rule.interval_count,
        next_run: rule.next_run,
        end_date: rule.end_date ?? null,
        start_date: rule.start_date
      },
      now
    );

    for (const date of result.dates) {
      await createTransaction({
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        account_id: rule.account_id,
        to_account_id: rule.to_account_id,
        category_id: rule.category_id,
        subcategory_id: rule.subcategory_id,
        date_time: date.toISOString(),
        note: rule.note,
        recurring_id: rule.id
      });
      created++;
    }

    const lastRun = result.dates.length
      ? result.dates[result.dates.length - 1].toISOString()
      : rule.last_run ?? null;

    await db.runAsync(
      'UPDATE recurring_rules SET next_run = ?, last_run = ?, is_active = ? WHERE id = ?',
      [result.nextRun.toISOString(), lastRun, result.finished ? 0 : 1, rule.id]
    );

    if (result.finished) finished++;
  }

  return { created, finished };
}
