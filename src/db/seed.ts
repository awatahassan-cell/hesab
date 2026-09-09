import { IDatabase } from './types';

// 1. Comprehensive Expense Categories (16 top categories like Money Manager / Wallet)
export const defaultExpenseCategories = [
  {
    id: 'cat_food',
    name_key: 'food',
    icon: 'restaurant-outline',
    color: '#E63946',
    subcategories: [
      { id: 'sub_restaurant', name_key: 'restaurant' },
      { id: 'sub_fastfood', name_key: 'fastfood' },
      { id: 'sub_cafe', name_key: 'cafe' },
      { id: 'sub_sweets', name_key: 'sweets' }
    ]
  },
  {
    id: 'cat_groceries',
    name_key: 'groceries',
    icon: 'cart-outline',
    color: '#FB8500',
    subcategories: [
      { id: 'sub_bread', name_key: 'bread' },
      { id: 'sub_meat', name_key: 'meat' },
      { id: 'sub_vegetables', name_key: 'vegetables' },
      { id: 'sub_dairy', name_key: 'dairy' }
    ]
  },
  {
    id: 'cat_transport',
    name_key: 'transport',
    icon: 'car-outline',
    color: '#FFB703',
    subcategories: [
      { id: 'sub_taxi', name_key: 'taxi' },
      { id: 'sub_bus', name_key: 'bus' }
    ]
  },
  {
    id: 'cat_fuel',
    name_key: 'fuel',
    icon: 'speedometer-outline',
    color: '#D97706',
    subcategories: []
  },
  {
    id: 'cat_vehicle',
    name_key: 'vehicle',
    icon: 'construct-outline',
    color: '#9A8C98',
    subcategories: [
      { id: 'sub_car_repair', name_key: 'car_repair' },
      { id: 'sub_car_wash', name_key: 'car_wash' }
    ]
  },
  {
    id: 'cat_housing',
    name_key: 'housing',
    icon: 'home-outline',
    color: '#4A4E69',
    subcategories: []
  },
  {
    id: 'cat_utilities',
    name_key: 'utilities',
    icon: 'flash-outline',
    color: '#7209B7',
    subcategories: [
      { id: 'sub_electricity', name_key: 'electricity' },
      { id: 'sub_generator', name_key: 'generator' },
      { id: 'sub_water', name_key: 'water' },
      { id: 'sub_gas', name_key: 'gas' }
    ]
  },
  {
    id: 'cat_internet',
    name_key: 'internet',
    icon: 'wifi-outline',
    color: '#3A86FF',
    subcategories: [
      { id: 'sub_wifi', name_key: 'wifi' },
      { id: 'sub_mobile_balance', name_key: 'mobile_balance' }
    ]
  },
  {
    id: 'cat_health',
    name_key: 'health',
    icon: 'medkit-outline',
    color: '#06D6A0',
    subcategories: [
      { id: 'sub_doctor', name_key: 'doctor' },
      { id: 'sub_medicine', name_key: 'medicine' },
      { id: 'sub_dental', name_key: 'dental' }
    ]
  },
  {
    id: 'cat_education',
    name_key: 'education',
    icon: 'school-outline',
    color: '#118AB2',
    subcategories: [
      { id: 'sub_tuition', name_key: 'tuition' },
      { id: 'sub_books', name_key: 'books' }
    ]
  },
  {
    id: 'cat_clothing',
    name_key: 'clothing',
    icon: 'shirt-outline',
    color: '#E07A5F',
    subcategories: [
      { id: 'sub_shoes', name_key: 'shoes' }
    ]
  },
  {
    id: 'cat_personal_care',
    name_key: 'personal_care',
    icon: 'cut-outline',
    color: '#DDA15E',
    subcategories: [
      { id: 'sub_barber', name_key: 'barber' },
      { id: 'sub_cosmetics', name_key: 'cosmetics' }
    ]
  },
  {
    id: 'cat_entertainment',
    name_key: 'entertainment',
    icon: 'game-controller-outline',
    color: '#8338EC',
    subcategories: []
  },
  {
    id: 'cat_family',
    name_key: 'family',
    icon: 'people-outline',
    color: '#F72585',
    subcategories: [
      { id: 'sub_baby', name_key: 'baby' },
      { id: 'sub_toys', name_key: 'toys' }
    ]
  },
  {
    id: 'cat_gifts',
    name_key: 'gifts',
    icon: 'gift-outline',
    color: '#EF476F',
    subcategories: [
      { id: 'sub_charity', name_key: 'charity' }
    ]
  },
  {
    id: 'cat_travel',
    name_key: 'travel',
    icon: 'airplane-outline',
    color: '#2A9D8F',
    subcategories: [
      { id: 'sub_hotel', name_key: 'hotel' },
      { id: 'sub_flight', name_key: 'flight' }
    ]
  },
  {
    id: 'cat_financial_fees',
    name_key: 'financial_fees',
    icon: 'card-outline',
    color: '#6C757D',
    subcategories: []
  }
];

// 2. Comprehensive Income Categories
export const defaultIncomeCategories = [
  {
    id: 'cat_salary',
    name_key: 'salary',
    icon: 'cash-outline',
    color: '#16A34A',
    subcategories: [
      { id: 'sub_overtime', name_key: 'overtime' },
      { id: 'sub_bonus', name_key: 'bonus' }
    ]
  },
  {
    id: 'cat_freelance',
    name_key: 'freelance',
    icon: 'briefcase-outline',
    color: '#2563EB',
    subcategories: []
  },
  {
    id: 'cat_rent_income',
    name_key: 'rent_income',
    icon: 'business-outline',
    color: '#8B5CF6',
    subcategories: []
  },
  {
    id: 'cat_selling',
    name_key: 'selling',
    icon: 'pricetag-outline',
    color: '#F59E0B',
    subcategories: []
  },
  {
    id: 'cat_gifts_income',
    name_key: 'gifts',
    icon: 'heart-outline',
    color: '#EC4899',
    subcategories: []
  },
  {
    id: 'cat_other_income',
    name_key: 'other',
    icon: 'add-circle-outline',
    color: '#64748B',
    subcategories: []
  }
];

export async function restoreDefaultCategories(db: IDatabase): Promise<void> {
  // Check and re-insert missing expense categories & subcategories
  for (let i = 0; i < defaultExpenseCategories.length; i++) {
    const c = defaultExpenseCategories[i];
    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id = ?', [c.id]);
    if (!existing) {
      await db.runAsync(
        `INSERT INTO categories (id, name_key, custom_name, type, icon, color, sort_order, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name_key, null, 'expense', c.icon, c.color, i, 1]
      );
    }
    for (let j = 0; j < c.subcategories.length; j++) {
      const sub = c.subcategories[j];
      const existingSub = await db.getFirstAsync<{ id: string }>('SELECT id FROM subcategories WHERE id = ?', [sub.id]);
      if (!existingSub) {
        await db.runAsync(
          `INSERT INTO subcategories (id, category_id, name_key, custom_name, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [sub.id, c.id, sub.name_key, null, j]
        );
      }
    }
  }

  // Check and re-insert missing income categories & subcategories
  for (let i = 0; i < defaultIncomeCategories.length; i++) {
    const c = defaultIncomeCategories[i];
    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM categories WHERE id = ?', [c.id]);
    if (!existing) {
      await db.runAsync(
        `INSERT INTO categories (id, name_key, custom_name, type, icon, color, sort_order, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name_key, null, 'income', c.icon, c.color, i, 1]
      );
    }
    for (let j = 0; j < c.subcategories.length; j++) {
      const sub = c.subcategories[j];
      const existingSub = await db.getFirstAsync<{ id: string }>('SELECT id FROM subcategories WHERE id = ?', [sub.id]);
      if (!existingSub) {
        await db.runAsync(
          `INSERT INTO subcategories (id, category_id, name_key, custom_name, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [sub.id, c.id, sub.name_key, null, j]
        );
      }
    }
  }
}

export async function seedInitialData(db: IDatabase, primaryCurrency: string = 'IQD') {
  const existingCat = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (existingCat && existingCat.count > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();

  // 1. Seed Accounts (Primary account: پاشەکەوت / Savings)
  const defaultAccounts = [
    { id: 'acc_savings', name: 'پاشەکەوت (Savings)', type: 'savings', icon: 'wallet-outline', color: '#10B981', starting_balance: 0, sort: 0 }
  ];

  for (const acc of defaultAccounts) {
    await db.runAsync(
      `INSERT INTO accounts (id, name, type, icon, color, starting_balance, current_balance, currency, is_archived, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [acc.id, acc.name, acc.type, acc.icon, acc.color, acc.starting_balance, acc.starting_balance, primaryCurrency, 0, acc.sort, now]
    );
  }

  // 2. Insert all default categories & subcategories
  await restoreDefaultCategories(db);

  console.log('Database seeded with rich categories and accounts!');
}
