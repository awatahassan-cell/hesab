import { getDatabase } from '../index';
import { Category, Subcategory } from '../schema';

export async function getAllCategories(type?: 'expense' | 'income'): Promise<Category[]> {
  const db = await getDatabase();
  const query = type
    ? 'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC'
    : 'SELECT * FROM categories ORDER BY type DESC, sort_order ASC';
  const params = type ? [type] : [];

  const categories = await db.getAllAsync<Category>(query, params);
  const subcategories = await db.getAllAsync<Subcategory>('SELECT * FROM subcategories ORDER BY sort_order ASC');

  // Map subcategories to each category
  return categories.map((cat) => ({
    ...cat,
    subcategories: subcategories.filter((s) => s.category_id === cat.id)
  }));
}

export async function createCategory(data: {
  name_key: string;
  custom_name?: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
}): Promise<string> {
  const db = await getDatabase();
  const id = 'cat_' + Date.now().toString();

  await db.runAsync(
    `INSERT INTO categories (id, name_key, custom_name, type, icon, color, sort_order, is_default)
     VALUES (?, ?, ?, ?, ?, ?, 99, 0)`,
    [id, data.name_key, data.custom_name || null, data.type, data.icon, data.color]
  );

  return id;
}

export async function updateCategory(
  id: string,
  data: Partial<Pick<Category, 'custom_name' | 'icon' | 'color' | 'sort_order'>>
): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.custom_name !== undefined) { fields.push('custom_name = ?'); values.push(data.custom_name); }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function createSubcategory(categoryId: string, name: string): Promise<string> {
  const db = await getDatabase();
  const id = 'sub_' + Date.now().toString();

  await db.runAsync(
    `INSERT INTO subcategories (id, category_id, name_key, custom_name, sort_order)
     VALUES (?, ?, 'custom', ?, 99)`,
    [id, categoryId, name]
  );

  return id;
}

export async function deleteSubcategory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM subcategories WHERE id = ?', [id]);
}
