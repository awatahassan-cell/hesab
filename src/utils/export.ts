import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getDatabase } from '../db';
import { Transaction, Account, Category, Subcategory, Debt, Budget, ShoppingTrip, ShoppingItem } from '../db/schema';
import { formatCurrency } from './currency';

export async function exportTransactionsToCSV(transactions: Transaction[]): Promise<void> {
  const headers = ['ID', 'Date', 'Type', 'Amount', 'Currency', 'Account', 'Category', 'Note'];
  
  const rows = transactions.map((t) => [
    t.id,
    t.date_time.replace('T', ' ').substring(0, 19),
    t.type,
    t.amount.toString(),
    t.currency,
    `"${(t.account_name || '').replace(/"/g, '""')}"`,
    `"${(t.category_custom_name || t.category_name_key || '').replace(/"/g, '""')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`
  ]);

  // Include UTF-8 BOM so Excel properly displays Kurdish and Arabic characters
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  // Web Platform: direct browser download
  if (Platform.OS === 'web' || (typeof window !== 'undefined' && (window as any).document)) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hesab_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Native Mobile Platform: FileSystem & Sharing
  const filePath = `${FileSystem.documentDirectory}hesab_transactions_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Transactions CSV'
    });
  }
}

export async function exportBackupJSON(): Promise<void> {
  const db = await getDatabase();
  const [
    accounts,
    categories,
    subcategories,
    transactions,
    debts,
    budgets,
    shoppingTrips,
    shoppingItems
  ] = await Promise.all([
    db.getAllAsync<Account>('SELECT * FROM accounts'),
    db.getAllAsync<Category>('SELECT * FROM categories'),
    db.getAllAsync<Subcategory>('SELECT * FROM subcategories'),
    db.getAllAsync<Transaction>('SELECT * FROM transactions'),
    db.getAllAsync<Debt>('SELECT * FROM debts'),
    db.getAllAsync<Budget>('SELECT * FROM budgets'),
    db.getAllAsync<ShoppingTrip>('SELECT * FROM shopping_trips'),
    db.getAllAsync<ShoppingItem>('SELECT * FROM shopping_items')
  ]);

  const backupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    accounts,
    categories,
    subcategories,
    transactions,
    debts,
    budgets,
    shoppingTrips,
    shoppingItems
  };

  const jsonContent = JSON.stringify(backupData, null, 2);
  const filePath = `${FileSystem.documentDirectory}hesab_backup_${Date.now()}.json`;

  await FileSystem.writeAsStringAsync(filePath, jsonContent, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Hesab Full Backup'
    });
  }
}

export async function restoreBackupFromJSON(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !Array.isArray(data.accounts)) {
      throw new Error('Invalid backup file format');
    }

    const db = await getDatabase();

    await db.execAsync(`
      DELETE FROM shopping_items;
      DELETE FROM shopping_trips;
      DELETE FROM debts;
      DELETE FROM budgets;
      DELETE FROM transactions;
      DELETE FROM subcategories;
      DELETE FROM categories;
      DELETE FROM accounts;
    `);

    for (const a of data.accounts) {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, icon, color, starting_balance, current_balance, currency, is_archived, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.name, a.type, a.icon, a.color, a.starting_balance, a.current_balance, a.currency, a.is_archived, a.sort_order, a.created_at]
      );
    }

    for (const c of data.categories) {
      await db.runAsync(
        `INSERT INTO categories (id, name_key, custom_name, type, icon, color, sort_order, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name_key, c.custom_name || null, c.type, c.icon, c.color, c.sort_order, c.is_default]
      );
    }

    for (const s of data.subcategories || []) {
      await db.runAsync(
        `INSERT INTO subcategories (id, category_id, name_key, custom_name, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [s.id, s.category_id, s.name_key, s.custom_name || null, s.sort_order]
      );
    }

    for (const t of data.transactions) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, amount, currency, exchange_rate, account_id, to_account_id, category_id, subcategory_id, date_time, note, receipt_uri, recurring_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.type, t.amount, t.currency, t.exchange_rate || 1, t.account_id, t.to_account_id || null, t.category_id || null, t.subcategory_id || null, t.date_time, t.note || null, t.receipt_uri || null, t.recurring_id || null, t.created_at]
      );
    }

    for (const d of data.debts || []) {
      await db.runAsync(
        `INSERT INTO debts (id, type, person_name, amount, currency, account_id, date, note, is_settled, settled_date, settled_transaction_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.type, d.person_name, d.amount, d.currency, d.account_id, d.date, d.note || null, d.is_settled, d.settled_date || null, d.settled_transaction_id || null, d.created_at]
      );
    }

    for (const b of data.budgets || []) {
      await db.runAsync(
        `INSERT INTO budgets (id, category_id, amount, period, created_at) VALUES (?, ?, ?, ?, ?)`,
        [b.id, b.category_id || null, b.amount, b.period, b.created_at]
      );
    }

    for (const tr of data.shoppingTrips || []) {
      await db.runAsync(
        `INSERT INTO shopping_trips (id, store_name, date_time, account_id, total_amount, currency, status, receipt_uri, transaction_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tr.id, tr.store_name, tr.date_time, tr.account_id, tr.total_amount, tr.currency, tr.status, tr.receipt_uri || null, tr.transaction_id || null, tr.created_at]
      );
    }

    for (const it of data.shoppingItems || []) {
      await db.runAsync(
        `INSERT INTO shopping_items (id, trip_id, name, price, quantity, is_checked, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [it.id, it.trip_id, it.name, it.price, it.quantity || 1, it.is_checked, it.category_id || null]
      );
    }

    return true;
  } catch (err) {
    console.error('Failed to restore backup', err);
    return false;
  }
}

export async function generatePDFReport(options: {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  currency: string;
  transactions: Transaction[];
  categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  isRTL: boolean;
}): Promise<void> {
  const dir = options.isRTL ? 'rtl' : 'ltr';
  const align = options.isRTL ? 'right' : 'left';

  const rowsHtml = options.transactions.slice(0, 50).map((t) => `
    <tr style="border-bottom: 1px solid #e5e5e0;">
      <td style="padding: 8px; text-align: ${align};">${t.date_time.substring(0, 10)}</td>
      <td style="padding: 8px; text-align: ${align};">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount, t.currency)}</td>
      <td style="padding: 8px; text-align: ${align};">${t.category_custom_name || t.category_name_key || '-'}</td>
      <td style="padding: 8px; text-align: ${align};">${t.account_name || '-'}</td>
      <td style="padding: 8px; text-align: ${align};">${t.note || '-'}</td>
    </tr>
  `).join('');

  const catHtml = options.categoryBreakdown.map((c) => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #eee;">
      <span>${c.name}</span>
      <strong>${formatCurrency(c.amount, options.currency)} (${c.percentage}%)</strong>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}">
    <head>
      <meta charset="utf-8">
      <title>Hesab Financial Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #18181b; }
        .header { border-bottom: 2px solid #242426; padding-bottom: 12px; margin-bottom: 20px; }
        .summary-box { display: flex; gap: 16px; margin-bottom: 24px; }
        .card { flex: 1; padding: 14px; background: #f9f9f7; border: 1px solid #e5e5e0; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #f3f3f0; padding: 8px; text-align: ${align}; border-bottom: 2px solid #ccc; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Hesab — Financial Report (${options.periodLabel})</h2>
        <p style="color: #666; font-size: 12px;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="summary-box">
        <div class="card">
          <div style="font-size: 12px; color: #666;">Total Income</div>
          <div style="font-size: 20px; font-weight: bold; color: #16a34a;">+${formatCurrency(options.totalIncome, options.currency)}</div>
        </div>
        <div class="card">
          <div style="font-size: 12px; color: #666;">Total Expenses</div>
          <div style="font-size: 20px; font-weight: bold; color: #dc2626;">-${formatCurrency(options.totalExpense, options.currency)}</div>
        </div>
        <div class="card">
          <div style="font-size: 12px; color: #666;">Net Savings</div>
          <div style="font-size: 20px; font-weight: bold;">${formatCurrency(options.totalIncome - options.totalExpense, options.currency)}</div>
        </div>
      </div>

      <h3>Spending by Category</h3>
      <div style="margin-bottom: 24px;">${catHtml || '<p style="color:#999">No expenses recorded</p>'}</div>

      <h3>Recent Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Account</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Web Platform: open print dialog
  if (Platform.OS === 'web' || (typeof window !== 'undefined' && (window as any).document)) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
    return;
  }

  // Native Platform: Print to file and share
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Hesab Financial Report' });
  }
}
