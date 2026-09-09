import { getDatabase } from '../index';
import { Budget } from '../schema';
import { getPeriodRange } from '../../utils/dates';

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isWarning: boolean; // >= 80%
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Budget>(`
    SELECT 
      b.*,
      c.name_key as category_name_key,
      c.custom_name as category_custom_name,
      c.icon as category_icon,
      c.color as category_color
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    ORDER BY b.category_id IS NULL DESC, b.amount DESC
  `);
}

export async function setBudget(amount: number, categoryId?: string): Promise<string> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Check if budget exists for this category or total
  const existing = categoryId
    ? await db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE category_id = ?', [categoryId])
    : await db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE category_id IS NULL');

  if (existing) {
    await db.runAsync('UPDATE budgets SET amount = ? WHERE id = ?', [amount, existing.id]);
    return existing.id;
  }

  const id = 'bgt_' + Date.now().toString();
  await db.runAsync(
    'INSERT INTO budgets (id, category_id, amount, period, created_at) VALUES (?, ?, ?, "monthly", ?)',
    [id, categoryId || null, amount, now]
  );
  return id;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

export async function getBudgetProgressList(monthStartDay: number = 1): Promise<BudgetProgress[]> {
  const db = await getDatabase();
  const budgets = await getAllBudgets();
  const { start, end } = getPeriodRange('month', new Date(), monthStartDay);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const results: BudgetProgress[] = [];

  for (const b of budgets) {
    let spent = 0;
    if (b.category_id) {
      const res = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'expense' AND category_id = ? AND date_time >= ? AND date_time <= ?",
        [b.category_id, startIso, endIso]
      );
      spent = res?.sum || 0;
    } else {
      const res = await db.getFirstAsync<{ sum: number }>(
        "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'expense' AND date_time >= ? AND date_time <= ?",
        [startIso, endIso]
      );
      spent = res?.sum || 0;
    }

    const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    const remaining = Math.max(0, b.amount - spent);

    results.push({
      budget: b,
      spent,
      remaining,
      percentage,
      isOverBudget: spent >= b.amount,
      isWarning: percentage >= 80
    });
  }

  return results;
}
