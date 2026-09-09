import { Account, Category, Reminder, SavingsGoal } from './schema';
import i18n from '../i18n';

/**
 * Read through getDefaultAccounts(), never directly: the name is translated at
 * call time, because this module is imported long before a language is chosen.
 */
const DEFAULT_ACCOUNTS_RAW: Account[] = [
  {
    id: 'acc_savings',
    name: 'Savings',
    type: 'savings',
    icon: 'wallet-outline',
    color: '#10B981',
    starting_balance: 0,
    current_balance: 0,
    currency: 'IQD',
    is_archived: 0,
    sort_order: 0,
    created_at: new Date().toISOString()
  }
];

export function getDefaultAccounts(): Account[] {
  return DEFAULT_ACCOUNTS_RAW.map((a) =>
    a.id === 'acc_savings'
      ? { ...a, name: i18n.t('accounts.default_savings', { defaultValue: 'Savings' }) }
      : a
  );
}

export const DEFAULT_CATEGORIES: Category[] = [
  // 16 Expenses
  {
    id: 'cat_food',
    name_key: 'food',
    type: 'expense',
    icon: 'restaurant-outline',
    color: '#E63946',
    sort_order: 0,
    is_default: 1,
    subcategories: [
      { id: 'sub_restaurant', category_id: 'cat_food', name_key: 'restaurant', sort_order: 0 },
      { id: 'sub_fastfood', category_id: 'cat_food', name_key: 'fastfood', sort_order: 1 },
      { id: 'sub_cafe', category_id: 'cat_food', name_key: 'cafe', sort_order: 2 },
      { id: 'sub_sweets', category_id: 'cat_food', name_key: 'sweets', sort_order: 3 }
    ]
  },
  {
    id: 'cat_groceries',
    name_key: 'groceries',
    type: 'expense',
    icon: 'cart-outline',
    color: '#FB8500',
    sort_order: 1,
    is_default: 1,
    subcategories: [
      { id: 'sub_bread', category_id: 'cat_groceries', name_key: 'bread', sort_order: 0 },
      { id: 'sub_meat', category_id: 'cat_groceries', name_key: 'meat', sort_order: 1 },
      { id: 'sub_vegetables', category_id: 'cat_groceries', name_key: 'vegetables', sort_order: 2 },
      { id: 'sub_dairy', category_id: 'cat_groceries', name_key: 'dairy', sort_order: 3 }
    ]
  },
  {
    id: 'cat_transport',
    name_key: 'transport',
    type: 'expense',
    icon: 'car-outline',
    color: '#FFB703',
    sort_order: 2,
    is_default: 1,
    subcategories: [
      { id: 'sub_taxi', category_id: 'cat_transport', name_key: 'taxi', sort_order: 0 },
      { id: 'sub_bus', category_id: 'cat_transport', name_key: 'bus', sort_order: 1 }
    ]
  },
  {
    id: 'cat_fuel',
    name_key: 'fuel',
    type: 'expense',
    icon: 'speedometer-outline',
    color: '#D97706',
    sort_order: 3,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_vehicle',
    name_key: 'vehicle',
    type: 'expense',
    icon: 'construct-outline',
    color: '#9A8C98',
    sort_order: 4,
    is_default: 1,
    subcategories: [
      { id: 'sub_car_repair', category_id: 'cat_vehicle', name_key: 'car_repair', sort_order: 0 },
      { id: 'sub_car_wash', category_id: 'cat_vehicle', name_key: 'car_wash', sort_order: 1 }
    ]
  },
  {
    id: 'cat_housing',
    name_key: 'housing',
    type: 'expense',
    icon: 'home-outline',
    color: '#4A4E69',
    sort_order: 5,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_utilities',
    name_key: 'utilities',
    type: 'expense',
    icon: 'flash-outline',
    color: '#7209B7',
    sort_order: 6,
    is_default: 1,
    subcategories: [
      { id: 'sub_electricity', category_id: 'cat_utilities', name_key: 'electricity', sort_order: 0 },
      { id: 'sub_generator', category_id: 'cat_utilities', name_key: 'generator', sort_order: 1 },
      { id: 'sub_water', category_id: 'cat_utilities', name_key: 'water', sort_order: 2 },
      { id: 'sub_gas', category_id: 'cat_utilities', name_key: 'gas', sort_order: 3 }
    ]
  },
  {
    id: 'cat_internet',
    name_key: 'internet',
    type: 'expense',
    icon: 'wifi-outline',
    color: '#3A86FF',
    sort_order: 7,
    is_default: 1,
    subcategories: [
      { id: 'sub_wifi', category_id: 'cat_internet', name_key: 'wifi', sort_order: 0 },
      { id: 'sub_mobile_balance', category_id: 'cat_internet', name_key: 'mobile_balance', sort_order: 1 }
    ]
  },
  {
    id: 'cat_health',
    name_key: 'health',
    type: 'expense',
    icon: 'medkit-outline',
    color: '#06D6A0',
    sort_order: 8,
    is_default: 1,
    subcategories: [
      { id: 'sub_doctor', category_id: 'cat_health', name_key: 'doctor', sort_order: 0 },
      { id: 'sub_medicine', category_id: 'cat_health', name_key: 'medicine', sort_order: 1 },
      { id: 'sub_dental', category_id: 'cat_health', name_key: 'dental', sort_order: 2 }
    ]
  },
  {
    id: 'cat_education',
    name_key: 'education',
    type: 'expense',
    icon: 'school-outline',
    color: '#118AB2',
    sort_order: 9,
    is_default: 1,
    subcategories: [
      { id: 'sub_tuition', category_id: 'cat_education', name_key: 'tuition', sort_order: 0 },
      { id: 'sub_books', category_id: 'cat_education', name_key: 'books', sort_order: 1 }
    ]
  },
  {
    id: 'cat_clothing',
    name_key: 'clothing',
    type: 'expense',
    icon: 'shirt-outline',
    color: '#E07A5F',
    sort_order: 10,
    is_default: 1,
    subcategories: [
      { id: 'sub_shoes', category_id: 'cat_clothing', name_key: 'shoes', sort_order: 0 }
    ]
  },
  {
    id: 'cat_personal_care',
    name_key: 'personal_care',
    type: 'expense',
    icon: 'cut-outline',
    color: '#DDA15E',
    sort_order: 11,
    is_default: 1,
    subcategories: [
      { id: 'sub_barber', category_id: 'cat_personal_care', name_key: 'barber', sort_order: 0 },
      { id: 'sub_cosmetics', category_id: 'cat_personal_care', name_key: 'cosmetics', sort_order: 1 }
    ]
  },
  {
    id: 'cat_entertainment',
    name_key: 'entertainment',
    type: 'expense',
    icon: 'game-controller-outline',
    color: '#8338EC',
    sort_order: 12,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_family',
    name_key: 'family',
    type: 'expense',
    icon: 'people-outline',
    color: '#F72585',
    sort_order: 13,
    is_default: 1,
    subcategories: [
      { id: 'sub_baby', category_id: 'cat_family', name_key: 'baby', sort_order: 0 },
      { id: 'sub_toys', category_id: 'cat_family', name_key: 'toys', sort_order: 1 }
    ]
  },
  {
    id: 'cat_gifts',
    name_key: 'gifts',
    type: 'expense',
    icon: 'gift-outline',
    color: '#EF476F',
    sort_order: 14,
    is_default: 1,
    subcategories: [
      { id: 'sub_charity', category_id: 'cat_gifts', name_key: 'charity', sort_order: 0 }
    ]
  },
  {
    id: 'cat_travel',
    name_key: 'travel',
    type: 'expense',
    icon: 'airplane-outline',
    color: '#2A9D8F',
    sort_order: 15,
    is_default: 1,
    subcategories: [
      { id: 'sub_hotel', category_id: 'cat_travel', name_key: 'hotel', sort_order: 0 },
      { id: 'sub_flight', category_id: 'cat_travel', name_key: 'flight', sort_order: 1 }
    ]
  },
  {
    id: 'cat_financial_fees',
    name_key: 'financial_fees',
    type: 'expense',
    icon: 'card-outline',
    color: '#6C757D',
    sort_order: 16,
    is_default: 1,
    subcategories: []
  },

  // 6 Incomes
  {
    id: 'cat_salary',
    name_key: 'salary',
    type: 'income',
    icon: 'cash-outline',
    color: '#16A34A',
    sort_order: 0,
    is_default: 1,
    subcategories: [
      { id: 'sub_overtime', category_id: 'cat_salary', name_key: 'overtime', sort_order: 0 },
      { id: 'sub_bonus', category_id: 'cat_salary', name_key: 'bonus', sort_order: 1 }
    ]
  },
  {
    id: 'cat_freelance',
    name_key: 'freelance',
    type: 'income',
    icon: 'briefcase-outline',
    color: '#2563EB',
    sort_order: 1,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_rent_income',
    name_key: 'rent_income',
    type: 'income',
    icon: 'business-outline',
    color: '#8B5CF6',
    sort_order: 2,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_selling',
    name_key: 'selling',
    type: 'income',
    icon: 'pricetag-outline',
    color: '#F59E0B',
    sort_order: 3,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_gifts_income',
    name_key: 'gifts',
    type: 'income',
    icon: 'heart-outline',
    color: '#EC4899',
    sort_order: 4,
    is_default: 1,
    subcategories: []
  },
  {
    id: 'cat_other_income',
    name_key: 'other',
    type: 'income',
    icon: 'add-circle-outline',
    color: '#64748B',
    sort_order: 5,
    is_default: 1,
    subcategories: []
  }
];

export const DEFAULT_REMINDERS: Reminder[] = [];

export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal_car',
    title: 'کڕینی ئۆتۆمبێل',
    target_amount: 8000,
    current_amount: 2500,
    currency: 'USD',
    target_date: '2026-12-31',
    color: '#3A86FF',
    icon: 'car-outline',
    is_completed: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'goal_gold',
    title: 'پاشەکەوتی زێڕ و حاڵەتی لەناکاو',
    target_amount: 3000000,
    current_amount: 1200000,
    currency: 'IQD',
    target_date: '2026-10-30',
    color: '#F59E0B',
    icon: 'shield-checkmark-outline',
    is_completed: 0,
    created_at: new Date().toISOString()
  }
];

