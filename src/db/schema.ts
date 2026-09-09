export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'savings' | 'custom';
  icon: string;
  color: string;
  starting_balance: number;
  current_balance: number;
  currency: string;
  is_archived: number; // 0 or 1
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: string;
  name_key: string;
  custom_name?: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  sort_order: number;
  is_default: number;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  category_id: string;
  name_key: string;
  custom_name?: string;
  sort_order: number;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  currency: string;
  exchange_rate: number;
  account_id: string;
  to_account_id?: string;
  category_id?: string;
  subcategory_id?: string;
  date_time: string; // ISO
  note?: string;
  receipt_uri?: string;
  recurring_id?: string;
  created_at: string;
  
  // Joined fields for convenience
  account_name?: string;
  to_account_name?: string;
  category_name_key?: string;
  category_custom_name?: string;
  category_icon?: string;
  category_color?: string;
  subcategory_name_key?: string;
  subcategory_custom_name?: string;
}

export interface Debt {
  id: string;
  type: 'lent' | 'borrowed';
  person_name: string;
  amount: number;
  currency: string;
  account_id: string;
  date: string;
  note?: string;
  is_settled: number; // 0 or 1
  settled_date?: string;
  settled_transaction_id?: string;
  created_at: string;
  
  account_name?: string;
}

export interface Budget {
  id: string;
  category_id?: string; // null for total budget
  amount: number;
  period: 'monthly';
  created_at: string;
  
  category_name_key?: string;
  category_custom_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface ShoppingTrip {
  id: string;
  store_name: string;
  date_time: string;
  account_id: string;
  total_amount: number;
  currency: string;
  status: 'list' | 'completed';
  receipt_uri?: string;
  transaction_id?: string;
  /** ISO datetime for a one-off shopping reminder, or null for none. */
  reminder_at?: string | null;
  created_at: string;
  
  account_name?: string;
  items?: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  trip_id: string;
  name: string;
  price: number;
  quantity: number;
  is_checked: number; // 0 or 1
  category_id?: string;
}

export interface Reminder {
  id: string;
  title: string;
  amount: number;
  currency: string;
  due_day: number; // Day of month (1-31)
  frequency: 'monthly' | 'weekly' | 'yearly';
  category_id?: string;
  is_paid: number; // 0 or 1 for current cycle
  last_paid_date?: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date?: string;
  color: string;
  icon: string;
  is_completed: number; // 0 or 1
  created_at: string;
}

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    starting_balance REAL NOT NULL DEFAULT 0,
    current_balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IQD',
    is_archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name_key TEXT NOT NULL,
    custom_name TEXT,
    type TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name_key TEXT NOT NULL,
    custom_name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IQD',
    exchange_rate REAL NOT NULL DEFAULT 1,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    category_id TEXT,
    subcategory_id TEXT,
    date_time TEXT NOT NULL,
    note TEXT,
    receipt_uri TEXT,
    recurring_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    person_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IQD',
    account_id TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    is_settled INTEGER NOT NULL DEFAULT 0,
    settled_date TEXT,
    settled_transaction_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    amount REAL NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shopping_trips (
    id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    date_time TEXT NOT NULL,
    account_id TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IQD',
    status TEXT NOT NULL DEFAULT 'list',
    receipt_uri TEXT,
    transaction_id TEXT,
    reminder_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    quantity REAL NOT NULL DEFAULT 1,
    is_checked INTEGER NOT NULL DEFAULT 0,
    category_id TEXT,
    FOREIGN KEY (trip_id) REFERENCES shopping_trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IQD',
    due_day INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    category_id TEXT,
    is_paid INTEGER NOT NULL DEFAULT 0,
    last_paid_date TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IQD',
    target_date TEXT,
    color TEXT NOT NULL DEFAULT '#10B981',
    icon TEXT NOT NULL DEFAULT 'flag-outline',
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(date_time);
  CREATE INDEX IF NOT EXISTS idx_trans_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_debts_settled ON debts(is_settled);
`;
