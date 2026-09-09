/**
 * Reading a CSV exported by another finance app.
 *
 * Nobody switches to an app that cannot take their history with them, so this
 * is deliberately forgiving: it guesses the columns, accepts the date and
 * number formats the common exports use, and reports the rows it could not
 * read instead of refusing the whole file.
 *
 * Everything here is pure. The screen decides what to do with the result.
 */

export type ImportType = 'expense' | 'income' | 'transfer';

export interface ParsedRow {
  /** 1-based line in the file, for reporting. */
  line: number;
  type: ImportType;
  amount: number;
  date: string; // ISO
  category?: string;
  account?: string;
  note?: string;
}

export interface RowError {
  line: number;
  reason: 'amount' | 'date';
  value: string;
}

export interface ColumnMapping {
  date: number;
  amount: number;
  type?: number;
  category?: number;
  account?: number;
  note?: number;
}

/**
 * Splits CSV text into rows of fields.
 *
 * Written by hand rather than split(',') because every real export quotes
 * fields that contain commas, and a note like "rent, March" would otherwise
 * shift every later column by one.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];

    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'; // an escaped quote inside a quoted field
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';' || ch === '\t') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Trailing newlines leave an empty row behind.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Header names the common exports use, lower-cased. */
const HEADER_HINTS: Record<keyof ColumnMapping, string[]> = {
  date: ['date', 'date_time', 'datetime', 'time', 'transaction date', 'تاریخ', 'التاريخ', 'بەروار'],
  amount: ['amount', 'value', 'sum', 'total', 'بڕ', 'المبلغ', 'مبلغ'],
  type: ['type', 'kind', 'income/expense', 'جۆر', 'النوع'],
  category: ['category', 'main category', 'categories', 'پۆل', 'الفئة'],
  account: ['account', 'wallet', 'accounts', 'هەژمار', 'الحساب'],
  note: ['note', 'notes', 'description', 'memo', 'comment', 'تێبینی', 'ملاحظة']
};

/**
 * Guesses which column holds what.
 *
 * Returns null when the file has no recognisable date or amount, which is the
 * one case the screen cannot recover from without asking.
 */
export function detectColumns(headers: string[]): ColumnMapping | null {
  const normalised = headers.map((h) => h.trim().toLowerCase());
  const find = (key: keyof ColumnMapping): number | undefined => {
    const hints = HEADER_HINTS[key];
    // Exact match first: "Amount" should not lose to "Amount (USD)" elsewhere.
    const exact = normalised.findIndex((h) => hints.includes(h));
    if (exact !== -1) return exact;
    const partial = normalised.findIndex((h) => hints.some((hint) => h.includes(hint)));
    return partial === -1 ? undefined : partial;
  };

  const date = find('date');
  const amount = find('amount');
  if (date === undefined || amount === undefined) return null;

  return {
    date,
    amount,
    type: find('type'),
    category: find('category'),
    account: find('account'),
    note: find('note')
  };
}

/**
 * Reads a number the way a spreadsheet wrote it.
 *
 * Handles thousands separators in both conventions, a trailing or leading
 * minus, parentheses for negatives, and a stray currency symbol.
 */
export function parseAmount(raw: string): number | null {
  let text = raw.trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.endsWith('-')) {
    negative = true;
    text = text.slice(0, -1);
  }

  // Strip anything that is not a digit, separator or sign.
  text = text.replace(/[^\d.,\-]/g, '').trim();
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever comes last is the decimal separator.
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // A lone comma is a decimal point only when it is not grouping digits.
    const after = text.length - lastComma - 1;
    text = after === 3 && text.indexOf(',') !== lastComma ? text.replace(/,/g, '')
      : after === 3 ? text.replace(',', '')
      : text.replace(',', '.');
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/**
 * Reads a date in the formats the common exports write.
 *
 * An ambiguous DD/MM vs MM/DD is resolved by `dayFirst`, which the screen
 * offers as a switch — there is no way to tell 03/04 apart from the file
 * alone, and guessing wrong moves every transaction by months.
 */
export function parseDate(raw: string, dayFirst = true): Date | null {
  const text = raw.trim();
  if (!text) return null;

  // ISO, with or without a time.
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, m, d, hh = '12', mm = '00', ss = '00'] = isoMatch;
    const date = new Date(+y, +m - 1, +d, +hh, +mm, +ss);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Slash or dot separated.
  const parts = text.match(/^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})(?:[T ](\d{1,2}):(\d{2}))?/);
  if (parts) {
    const [, a, b, c, hh = '12', mm = '00'] = parts;
    let year: number;
    let month: number;
    let day: number;

    if (a.length === 4) {
      year = +a;
      month = +b;
      day = +c;
    } else {
      year = +c < 100 ? 2000 + +c : +c;
      if (dayFirst) {
        day = +a;
        month = +b;
      } else {
        month = +a;
        day = +b;
      }
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day, +hh, +mm);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

const INCOME_WORDS = ['income', 'deposit', 'credit', 'in', 'داهات', 'دخل', 'إيراد'];
const TRANSFER_WORDS = ['transfer', 'گواستنەوە', 'تحويل'];

/**
 * Works out whether a row is money in or out.
 *
 * A type column wins. Failing that the sign of the amount decides, which is
 * how exports without a type column encode it.
 */
export function resolveType(typeCell: string | undefined, amount: number): ImportType {
  const text = (typeCell ?? '').trim().toLowerCase();
  if (text) {
    if (TRANSFER_WORDS.some((w) => text.includes(w))) return 'transfer';
    if (INCOME_WORDS.some((w) => text === w || text.includes(w))) return 'income';
    return 'expense';
  }
  return amount >= 0 ? 'income' : 'expense';
}

export interface BuildResult {
  rows: ParsedRow[];
  errors: RowError[];
}

/** Turns raw cells into rows ready to insert, collecting what it could not read. */
export function buildRows(
  dataRows: string[][],
  mapping: ColumnMapping,
  options: { dayFirst?: boolean; startLine?: number } = {}
): BuildResult {
  const dayFirst = options.dayFirst ?? true;
  const startLine = options.startLine ?? 2;
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  dataRows.forEach((cells, index) => {
    const line = startLine + index;
    const cell = (at: number | undefined) => (at === undefined ? undefined : (cells[at] ?? '').trim());

    const rawAmount = cell(mapping.amount) ?? '';
    const amount = parseAmount(rawAmount);
    if (amount === null || amount === 0) {
      errors.push({ line, reason: 'amount', value: rawAmount });
      return;
    }

    const rawDate = cell(mapping.date) ?? '';
    const date = parseDate(rawDate, dayFirst);
    if (!date) {
      errors.push({ line, reason: 'date', value: rawDate });
      return;
    }

    rows.push({
      line,
      type: resolveType(cell(mapping.type), amount),
      // Sign carried the direction; the app stores magnitude plus a type.
      amount: Math.abs(amount),
      date: date.toISOString(),
      category: cell(mapping.category) || undefined,
      account: cell(mapping.account) || undefined,
      note: cell(mapping.note) || undefined
    });
  });

  return { rows, errors };
}
