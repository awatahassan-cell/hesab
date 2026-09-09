import { getDatabase } from '../index';
import { SavingsGoal } from '../schema';

export async function getAllSavingsGoals(): Promise<SavingsGoal[]> {
  const db = await getDatabase();
  const goals = await db.getAllAsync<SavingsGoal>('SELECT * FROM savings_goals ORDER BY created_at DESC');
  return goals || [];
}

export async function createSavingsGoal(data: {
  title: string;
  target_amount: number;
  current_amount?: number;
  currency?: string;
  target_date?: string;
  color?: string;
  icon?: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'goal_' + Date.now().toString();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO savings_goals (id, title, target_amount, current_amount, currency, target_date, color, icon, is_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      data.title,
      data.target_amount,
      data.current_amount || 0,
      data.currency || 'IQD',
      data.target_date || null,
      data.color || '#10B981',
      data.icon || 'flag-outline',
      now
    ]
  );

  return id;
}

export async function updateSavingsGoal(
  id: string,
  data: Partial<Pick<SavingsGoal, 'title' | 'target_amount' | 'current_amount' | 'currency' | 'target_date' | 'color' | 'icon' | 'is_completed'>>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.target_amount !== undefined) { fields.push('target_amount = ?'); values.push(data.target_amount); }
  if (data.current_amount !== undefined) { fields.push('current_amount = ?'); values.push(data.current_amount); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
  if (data.target_date !== undefined) { fields.push('target_date = ?'); values.push(data.target_date); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
  if (data.is_completed !== undefined) { fields.push('is_completed = ?'); values.push(data.is_completed); }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function depositToGoal(id: string, amount: number): Promise<void> {
  const db = await getDatabase();
  const goal = await db.getFirstAsync<SavingsGoal>('SELECT * FROM savings_goals WHERE id = ?', [id]);
  if (!goal) return;

  const updatedCurrent = Math.max(0, (goal.current_amount || 0) + amount);
  const isCompleted = updatedCurrent >= goal.target_amount ? 1 : 0;

  await db.runAsync(
    'UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ?',
    [updatedCurrent, isCompleted, id]
  );
}

export async function withdrawFromGoal(id: string, amount: number): Promise<void> {
  const db = await getDatabase();
  const goal = await db.getFirstAsync<SavingsGoal>('SELECT * FROM savings_goals WHERE id = ?', [id]);
  if (!goal) return;

  const updatedCurrent = Math.max(0, (goal.current_amount || 0) - amount);
  const isCompleted = updatedCurrent >= goal.target_amount ? 1 : 0;

  await db.runAsync(
    'UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ?',
    [updatedCurrent, isCompleted, id]
  );
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
}
