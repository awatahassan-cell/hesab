/**
 * Grouping for the calendar and trend charts.
 *
 * Deliberately plain TypeScript rather than SQL GROUP BY: the web build backs
 * the database with a hand-written mock that only pattern-matches SQL, so an
 * aggregate query would quietly return ungrouped rows there while working on
 * a phone. One code path is worth more than the database doing the sum.
 */
import { Transaction } from '../db/schema';

export interface PeriodTotal {
  /** `YYYY-MM-DD` for days, `YYYY-MM` for months. */
  key: string;
  income: number;
  expense: number;
}

/** Local calendar day of an ISO timestamp, as `YYYY-MM-DD`. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Local calendar month of an ISO timestamp, as `YYYY-MM`. */
export function localMonthKey(iso: string): string {
  return localDayKey(iso).slice(0, 7);
}

function group(transactions: Transaction[], keyOf: (iso: string) => string): PeriodTotal[] {
  const totals = new Map<string, PeriodTotal>();

  for (const tx of transactions) {
    // Transfers move money between the user's own accounts. Counting them
    // would show income and expense that never happened.
    if (tx.type !== 'income' && tx.type !== 'expense') continue;

    const key = keyOf(tx.date_time);
    const entry = totals.get(key) ?? { key, income: 0, expense: 0 };
    if (tx.type === 'income') entry.income += tx.amount;
    else entry.expense += tx.amount;
    totals.set(key, entry);
  }

  return [...totals.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function totalsByDay(transactions: Transaction[]): PeriodTotal[] {
  return group(transactions, localDayKey);
}

export function totalsByMonth(transactions: Transaction[]): PeriodTotal[] {
  return group(transactions, localMonthKey);
}

/**
 * Fills in the months with no activity between the first and last entry, so a
 * trend line shows a real gap rather than joining across it.
 */
export function fillMonths(totals: PeriodTotal[], monthKeys: string[]): PeriodTotal[] {
  const byKey = new Map(totals.map((entry) => [entry.key, entry]));
  return monthKeys.map((key) => byKey.get(key) ?? { key, income: 0, expense: 0 });
}

/** The last `count` month keys ending at `end`, oldest first. */
export function recentMonthKeys(count: number, end: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`);
  }
  return keys;
}

/** Running net balance across a series, for the net-balance trend. */
export function runningNet(totals: PeriodTotal[]): { key: string; value: number }[] {
  let sum = 0;
  return totals.map((entry) => {
    sum += entry.income - entry.expense;
    return { key: entry.key, value: sum };
  });
}
