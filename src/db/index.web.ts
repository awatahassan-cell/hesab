import { IDatabase } from './types';
import { Account, Category, Subcategory, Transaction, Debt, Budget, ShoppingTrip, ShoppingItem, Reminder, SavingsGoal } from './schema';
import { getDefaultAccounts, DEFAULT_CATEGORIES, DEFAULT_REMINDERS, DEFAULT_SAVINGS_GOALS } from './defaultData';

interface WebState {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  debts: Debt[];
  budgets: Budget[];
  shopping_trips: ShoppingTrip[];
  shopping_items: ShoppingItem[];
  reminders: Reminder[];
  savings_goals: SavingsGoal[];
}

const STORAGE_KEY = 'hesab_web_database_v3';

function getStoredState(): WebState {
  let loadedState: WebState | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Clear legacy storage keys if present
      try {
        window.localStorage.removeItem('hesab_web_database_v1');
        window.localStorage.removeItem('hesab_web_database_v2');
      } catch (_) {}

      const data = window.localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          loadedState = {
            accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            subcategories: Array.isArray(parsed.subcategories) ? parsed.subcategories : [],
            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
            debts: Array.isArray(parsed.debts) ? parsed.debts : [],
            budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
            shopping_trips: (Array.isArray(parsed.shopping_trips) ? parsed.shopping_trips : []).map((tr: any) => ({
              ...tr,
              status: tr.status === 'completed' ? 'completed' : 'list',
              total_amount: typeof tr.total_amount === 'number' ? tr.total_amount : 0,
              currency: tr.currency && tr.currency !== 'list' ? tr.currency : 'IQD'
            })),
            shopping_items: (Array.isArray(parsed.shopping_items) ? parsed.shopping_items : []).map((it: any) => ({
              ...it,
              price: typeof it.price === 'number' ? it.price : 0,
              quantity: typeof it.quantity === 'number' ? it.quantity : 1,
              is_checked: it.is_checked ? 1 : 0
            })),
            reminders: Array.isArray(parsed.reminders)
              ? parsed.reminders.filter((r: any) => r.id !== 'rem_ronaki' && r.id !== 'rem_internet' && r.id !== 'rem_rent')
              : [],
            savings_goals: Array.isArray(parsed.savings_goals) ? parsed.savings_goals : [...DEFAULT_SAVINGS_GOALS]
          };
        }
      }
    }
  } catch (e) {
    console.error('Failed to read web db from localStorage', e);
  }

  if (!loadedState) {
    const initialSubs: Subcategory[] = [];
    for (const c of DEFAULT_CATEGORIES) {
      if (c && c.subcategories) initialSubs.push(...c.subcategories);
    }
    loadedState = {
      accounts: getDefaultAccounts(),
      categories: [...DEFAULT_CATEGORIES],
      subcategories: initialSubs,
      transactions: [],
      debts: [],
      budgets: [],
      shopping_trips: [],
      shopping_items: [],
      reminders: [...DEFAULT_REMINDERS],
      savings_goals: [...DEFAULT_SAVINGS_GOALS]
    };
  } else {
    // Remove accounts requested by user (acc_cash, acc_ewallet, acc_bank)
    const removedAccountIds = new Set(['acc_cash', 'acc_ewallet', 'acc_bank']);
    loadedState.accounts = loadedState.accounts.filter(
      (a) => a && !removedAccountIds.has(a.id)
    );

    // Re-link any transactions pointing to removed accounts to acc_savings
    for (const tx of loadedState.transactions) {
      if (tx && removedAccountIds.has(tx.account_id)) {
        tx.account_id = 'acc_savings';
      }
      if (tx && tx.to_account_id && removedAccountIds.has(tx.to_account_id)) {
        tx.to_account_id = 'acc_savings';
      }
    }

    // Ensure all default accounts exist
    const accIds = new Set(loadedState.accounts.map((a) => a && a.id));
    for (const defAcc of getDefaultAccounts()) {
      if (!accIds.has(defAcc.id)) {
        loadedState.accounts.push(defAcc);
      }
    }

    // Ensure subcategories exist
    if (!Array.isArray(loadedState.subcategories) || loadedState.subcategories.length === 0) {
      loadedState.subcategories = [];
      for (const cat of loadedState.categories) {
        if (cat && Array.isArray(cat.subcategories)) {
          loadedState.subcategories.push(...cat.subcategories);
        }
      }
    }
    // Ensure all default categories exist
    const catIds = new Set(loadedState.categories.map((c) => c && c.id));
    for (const defCat of DEFAULT_CATEGORIES) {
      if (!catIds.has(defCat.id)) {
        loadedState.categories.push(defCat);
      }
    }
  }

  return loadedState;
}

let state: WebState = getStoredState();
persistState();

function persistState() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.error('Failed to persist web db', e);
  }
}

/**
 * Values bind to '?' by position, so a clause's parameter is the one at its
 * own index among the placeholders before it. The filters below were matched
 * by substring but read params[0] regardless, which quietly ignored every
 * date range in the app: on web, "this month" showed all-time figures.
 */
function boundParam(sql: string, clause: string, params: any[]): any {
  const at = sql.indexOf(clause);
  if (at === -1) return undefined;
  const index = (sql.slice(0, at + clause.length).match(/\?/g) || []).length - 1;
  return params[index];
}

class WebDatabase implements IDatabase {
  async execAsync(sql: string): Promise<void> {
    const trimmed = sql.trim();
    if (trimmed.includes('DELETE FROM')) {
      const lines = trimmed.split(';');
      for (const line of lines) {
        const l = line.trim();
        if (l.startsWith('DELETE FROM')) {
          const match = l.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);
          if (match && (state as any)[match[1]]) {
            (state as any)[match[1]] = [];
          }
        }
      }
      persistState();
    }
  }

  async runAsync(sql: string, params: any[] = []): Promise<any> {
    const trimmed = sql.trim();

    // 1. INSERT INTO <table> (<fields>) VALUES (...)
    if (trimmed.toUpperCase().startsWith('INSERT INTO')) {
      const match = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
      if (match) {
        const table = match[1] as keyof WebState;
        const fields = match[2].split(',').map((f) => f.trim());
        const record: any = {};
        fields.forEach((f, idx) => {
          record[f] = params[idx] !== undefined ? params[idx] : null;
        });

        if (!state[table]) {
          (state as any)[table] = [];
        }
        (state[table] as any[]).push(record);

        if (table === 'subcategories') {
          const parent = state.categories?.find((c) => c && c.id === record.category_id);
          if (parent) {
            if (!parent.subcategories) parent.subcategories = [];
            parent.subcategories.push(record);
          }
        }
        if (table === 'categories') {
          if (!record.subcategories) record.subcategories = [];
        }

        persistState();
        return { lastInsertRowId: 1, changes: 1 };
      }
    }

    // 2. UPDATE <table> SET ... WHERE id = ?
    if (trimmed.toUpperCase().startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+)\s+WHERE\s+(.+)/i);
      if (match) {
        const table = match[1] as keyof WebState;
        const setClause = match[2];
        const whereClause = match[3];

        const setAssignments = setClause.split(',').map((s) => s.trim());
        if (whereClause.includes('id = ?')) {
          const id = params[params.length - 1];
          const item = (state[table] as any[])?.find((x) => x && x.id === id);
          if (item) {
            setAssignments.forEach((assign, idx) => {
              const field = assign.split('=')[0].trim();
              item[field] = params[idx];
            });
            persistState();
          }
        } else if (whereClause.includes('category_id IS NULL')) {
          const b = state.budgets?.find((x) => x && !x.category_id);
          if (b) {
            b.amount = params[0];
            persistState();
          }
        } else if (whereClause.includes('category_id = ?')) {
          const catId = params[params.length - 1];
          const b = state.budgets?.find((x) => x && x.category_id === catId);
          if (b) {
            b.amount = params[0];
            persistState();
          }
        }
        return { changes: 1 };
      }
    }

    // 3. DELETE FROM <table> WHERE id = ?
    if (trimmed.toUpperCase().startsWith('DELETE FROM')) {
      const match = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+id\s*=\s*\?/i);
      if (match) {
        const table = match[1] as keyof WebState;
        const id = params[0];
        if (state[table]) {
          (state[table] as any[]) = (state[table] as any[]).filter((x) => x && x.id !== id);
        }
        if (table === 'categories') {
          state.subcategories = (state.subcategories || []).filter((s) => s && s.category_id !== id);
        }
        if (table === 'subcategories') {
          for (const cat of (state.categories || [])) {
            if (cat && cat.subcategories) {
              cat.subcategories = cat.subcategories.filter((s) => s && s.id !== id);
            }
          }
        }
        persistState();
        return { changes: 1 };
      }
    }

    return { changes: 0 };
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim();

    // Reminders
    if (trimmed.includes('FROM reminders')) {
      return (state.reminders || []) as any;
    }

    // Savings Goals
    if (trimmed.includes('FROM savings_goals')) {
      return (state.savings_goals || []) as any;
    }
    // Accounts
    if (trimmed.includes('FROM accounts')) {
      if (trimmed.includes('is_archived = 0')) {
        return (state.accounts?.filter((a) => a && !a.is_archived) || []) as any;
      }
      if (trimmed.includes('is_archived = 1')) {
        return (state.accounts?.filter((a) => a && a.is_archived === 1) || []) as any;
      }
      return (state.accounts?.filter(Boolean) || []) as any;
    }

    // Categories
    if (trimmed.includes('FROM categories')) {
      let cats = [...(state.categories?.filter(Boolean) || [])];
      if (params.length > 0 && (params[0] === 'expense' || params[0] === 'income')) {
        cats = cats.filter((c) => c && c.type === params[0]);
      }
      return cats as any;
    }

    // Subcategories
    if (trimmed.includes('FROM subcategories')) {
      const subs = [...(state.subcategories || [])];
      return subs as any;
    }

    // Transactions with joins
    if (trimmed.includes('FROM transactions')) {
      let txs = [...(state.transactions?.filter(Boolean) || [])];

      txs = txs.map((t) => {
        const acc = state.accounts?.find((a) => a && a.id === t.account_id);
        const toAcc = state.accounts?.find((a) => a && a.id === t.to_account_id);
        const cat = state.categories?.find((c) => c && c.id === t.category_id);
        let sub: Subcategory | undefined = undefined;
        if (cat && cat.subcategories) {
          sub = cat.subcategories.find((s) => s.id === t.subcategory_id);
        }

        return {
          ...t,
          account_name: acc?.name,
          to_account_name: toAcc?.name,
          category_name_key: cat?.name_key,
          category_custom_name: cat?.custom_name,
          category_icon: cat?.icon,
          category_color: cat?.color,
          subcategory_name_key: sub?.name_key,
          subcategory_custom_name: sub?.custom_name
        };
      });

      if (trimmed.includes('WHERE')) {
        if (params.includes('expense')) {
          txs = txs.filter((t) => t.type === 'expense');
        } else if (params.includes('income')) {
          txs = txs.filter((t) => t.type === 'income');
        }

        const from = boundParam(trimmed, 't.date_time >= ?', params);
        const to = boundParam(trimmed, 't.date_time <= ?', params);
        const accountId = boundParam(trimmed, '(t.account_id = ? OR t.to_account_id = ?)', params);
        const categoryId = boundParam(trimmed, 't.category_id = ?', params);

        if (from !== undefined) txs = txs.filter((t) => (t.date_time || '') >= from);
        if (to !== undefined) txs = txs.filter((t) => (t.date_time || '') <= to);
        if (accountId !== undefined) {
          txs = txs.filter((t) => t.account_id === accountId || t.to_account_id === accountId);
        }
        if (categoryId !== undefined) txs = txs.filter((t) => t.category_id === categoryId);
      }

      if (trimmed.includes('GROUP BY t.category_id')) {
        const grouped: { [cid: string]: any } = {};
        for (const t of txs.filter((x) => x.type === 'expense')) {
          if (!t.category_id) continue;
          if (!grouped[t.category_id]) {
            grouped[t.category_id] = {
              category_id: t.category_id,
              category_name_key: t.category_name_key || 'other',
              category_custom_name: t.category_custom_name || null,
              icon: t.category_icon || 'pricetag-outline',
              color: t.category_color || '#666',
              total_amount: 0
            };
          }
          grouped[t.category_id].total_amount += t.amount;
        }
        return Object.values(grouped) as any;
      }

      txs.sort((a, b) => (b.date_time || '').localeCompare(a.date_time || ''));

      const limitMatch = trimmed.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const lim = parseInt(limitMatch[1], 10);
        txs = txs.slice(0, lim);
      }

      return txs as any;
    }

    // Debts
    if (trimmed.includes('FROM debts')) {
      let debts = [...(state.debts?.filter(Boolean) || [])];
      if (params.length > 0) {
        debts = debts.filter((d) => d && d.type === params[0]);
      }
      return debts.map((d) => ({
        ...d,
        account_name: state.accounts?.find((a) => a && a.id === d.account_id)?.name
      })) as any;
    }

    // Budgets
    if (trimmed.includes('FROM budgets')) {
      const budgets = [...(state.budgets?.filter(Boolean) || [])];
      return budgets.map((b) => {
        const cat = state.categories?.find((c) => c && c.id === b.category_id);
        return {
          ...b,
          category_name_key: cat?.name_key,
          category_custom_name: cat?.custom_name,
          category_icon: cat?.icon,
          category_color: cat?.color
        };
      }) as any;
    }

    // Shopping trips
    if (trimmed.includes('FROM shopping_trips')) {
      let trips = [...(state.shopping_trips?.filter(Boolean) || [])];
      if (params.length > 0) {
        trips = trips.filter((t) => t && t.status === params[0]);
      }
      return trips.map((tr) => ({
        ...tr,
        account_name: state.accounts?.find((a) => a && a.id === tr.account_id)?.name
      })) as any;
    }

    // Shopping items
    if (trimmed.includes('FROM shopping_items')) {
      const tripId = params[0];
      return (state.shopping_items?.filter((s) => s && s.trip_id === tripId) || []) as any;
    }

    return [];
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    const trimmed = sql.trim();

    if (trimmed.includes('COUNT(*) as count FROM categories')) {
      const count = state.categories?.length || 0;
      return { count } as any;
    }

    if (trimmed.includes('FROM reminders WHERE id = ?')) {
      const r = state.reminders?.find((x) => x && x.id === params[0]);
      return (r || null) as any;
    }

    if (trimmed.includes('FROM savings_goals WHERE id = ?')) {
      const g = state.savings_goals?.find((x) => x && x.id === params[0]);
      return (g || null) as any;
    }
    if (trimmed.includes('FROM accounts WHERE id = ?')) {
      const acc = state.accounts?.find((a) => a && a.id === params[0]);
      return (acc || null) as any;
    }

    if (trimmed.includes('SUM(amount)')) {
      let txs = [...(state.transactions?.filter(Boolean) || [])];
      if (trimmed.includes("type = 'income'")) txs = txs.filter((t) => t.type === 'income');
      if (trimmed.includes("type = 'expense'")) txs = txs.filter((t) => t.type === 'expense');
      if (trimmed.includes("type = 'transfer'")) txs = txs.filter((t) => t.type === 'transfer');
      if (trimmed.includes('account_id = ?')) txs = txs.filter((t) => t.account_id === params[0]);
      if (trimmed.includes('to_account_id = ?')) txs = txs.filter((t) => t.to_account_id === params[0]);
      if (trimmed.includes('category_id = ?')) txs = txs.filter((t) => t.category_id === params[0]);

      const from = boundParam(trimmed, 'date_time >= ?', params);
      const to = boundParam(trimmed, 'date_time <= ?', params);
      if (from !== undefined) txs = txs.filter((t) => t.date_time >= from);
      if (to !== undefined) txs = txs.filter((t) => t.date_time <= to);

      const sum = txs.reduce((acc, t) => acc + (t.amount || 0), 0);
      return { sum } as any;
    }

    if (trimmed.includes('FROM debts WHERE type =')) {
      const type = trimmed.includes("'lent'") ? 'lent' : 'borrowed';
      const sum = (state.debts || [])
        .filter((d) => d && d.type === type && !d.is_settled)
        .reduce((acc, d) => acc + (d.amount || 0), 0);
      return { sum } as any;
    }

    if (trimmed.includes('FROM budgets WHERE category_id = ?')) {
      const b = state.budgets?.find((x) => x && x.category_id === params[0]);
      return (b || null) as any;
    }
    if (trimmed.includes('FROM budgets WHERE category_id IS NULL')) {
      const b = state.budgets?.find((x) => x && !x.category_id);
      return (b || null) as any;
    }

    if (trimmed.includes('FROM shopping_trips WHERE id = ?')) {
      const tr = state.shopping_trips?.find((x) => x && x.id === params[0]);
      return (tr || null) as any;
    }

    if (trimmed.includes('SUM(price * quantity) as sum FROM shopping_items')) {
      const items = state.shopping_items?.filter((s) => s && s.trip_id === params[0]) || [];
      const sum = items.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0);
      return { sum } as any;
    }

    if (trimmed.includes('FROM debts WHERE id = ?')) {
      const d = state.debts?.find((x) => x && x.id === params[0]);
      return (d || null) as any;
    }

    if (trimmed.includes('FROM transactions WHERE id = ?')) {
      const t = state.transactions?.find((x) => x && x.id === params[0]);
      return (t || null) as any;
    }

    return null;
  }
}

const webDbInstance = new WebDatabase();

export async function getDatabase(): Promise<IDatabase> {
  return webDbInstance;
}

export async function initDatabase(primaryCurrency: string = 'IQD'): Promise<IDatabase> {
  return webDbInstance;
}

export async function restoreDefaultCategories(): Promise<void> {
  const initialSubs: Subcategory[] = [];
  for (const c of DEFAULT_CATEGORIES) {
    if (c && c.subcategories) initialSubs.push(...c.subcategories);
  }
  state.categories = [...DEFAULT_CATEGORIES];
  state.subcategories = initialSubs;
  persistState();
}

export async function resetAllDatabaseData(): Promise<void> {
  const initialSubs: Subcategory[] = [];
  for (const c of DEFAULT_CATEGORIES) {
    if (c && c.subcategories) initialSubs.push(...c.subcategories);
  }
  state = {
    accounts: getDefaultAccounts(),
    categories: [...DEFAULT_CATEGORIES],
    subcategories: initialSubs,
    transactions: [],
    debts: [],
    budgets: [],
    shopping_trips: [],
    shopping_items: [],
    reminders: [...DEFAULT_REMINDERS],
    savings_goals: [...DEFAULT_SAVINGS_GOALS]
  };
  persistState();
}

