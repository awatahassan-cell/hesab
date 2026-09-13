import {
  buildRows,
  detectColumns,
  detectDelimiter,
  parseAmount,
  parseCsv,
  parseDate,
  parseRows,
  resolveType
} from '../csvImport';

describe('parseCsv', () => {
  it('splits plain rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('keeps a comma inside a quoted field', () => {
    // Without this every column after a note like "rent, March" shifts by one.
    expect(parseCsv('note,amount\n"rent, March",500')).toEqual([
      ['note', 'amount'],
      ['rent, March', '500']
    ]);
  });

  it('unescapes a doubled quote', () => {
    expect(parseCsv('note\n"say ""hi"""')).toEqual([['note'], ['say "hi"']]);
  });

  it('handles CRLF and a trailing newline', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('strips a UTF-8 byte order mark', () => {
    expect(parseCsv('﻿date,amount\n2026-01-01,5')[0][0]).toBe('date');
  });

  it('accepts semicolons and tabs, which European exports use', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('drops blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('detectColumns', () => {
  it('finds the columns in this app\'s own export', () => {
    expect(detectColumns(['ID', 'Date', 'Type', 'Amount', 'Currency', 'Account', 'Category', 'Note']))
      .toEqual({ date: 1, amount: 3, type: 2, category: 6, account: 5, note: 7 });
  });

  it('prefers an exact header over a partial one', () => {
    const mapping = detectColumns(['Amount (USD)', 'Date', 'Amount']);
    expect(mapping?.amount).toBe(2);
  });

  it('tolerates a file with only a date and an amount', () => {
    expect(detectColumns(['Date', 'Amount'])).toEqual({
      date: 0, amount: 1, type: undefined, category: undefined, account: undefined, note: undefined
    });
  });

  it('gives up when there is no date or no amount', () => {
    expect(detectColumns(['Name', 'Colour'])).toBeNull();
  });
});

describe('parseAmount', () => {
  it('reads plain numbers', () => {
    expect(parseAmount('450')).toBe(450);
    expect(parseAmount('450.75')).toBe(450.75);
  });

  it('reads both thousands conventions', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('45,000')).toBe(45000);
  });

  it('reads a lone comma as a decimal point when it is not grouping', () => {
    expect(parseAmount('12,5')).toBe(12.5);
  });

  it('reads negatives in every notation exports use', () => {
    expect(parseAmount('-450')).toBe(-450);
    expect(parseAmount('450-')).toBe(-450);
    expect(parseAmount('(450)')).toBe(-450);
  });

  it('ignores a currency symbol', () => {
    expect(parseAmount('$1,200.00')).toBe(1200);
    expect(parseAmount('45000 د.ع')).toBe(45000);
  });

  it('returns null for something that is not a number', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('n/a')).toBeNull();
  });
});

describe('parseDate', () => {
  const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

  it('reads ISO, with or without a time', () => {
    expect(ymd(parseDate('2026-03-09'))).toBe('2026-3-9');
    expect(ymd(parseDate('2026-03-09 14:30'))).toBe('2026-3-9');
    expect(parseDate('2026-03-09T14:30:00')?.getHours()).toBe(14);
  });

  it('respects the day-first switch on an ambiguous date', () => {
    // 03/04 cannot be told apart from the file alone, and guessing wrong
    // moves every transaction by months.
    expect(ymd(parseDate('03/04/2026', true))).toBe('2026-4-3');
    expect(ymd(parseDate('03/04/2026', false))).toBe('2026-3-4');
  });

  it('reads dots and dashes as separators', () => {
    expect(ymd(parseDate('09.03.2026', true))).toBe('2026-3-9');
    expect(ymd(parseDate('09-03-2026', true))).toBe('2026-3-9');
  });

  it('expands a two digit year', () => {
    expect(ymd(parseDate('09/03/26', true))).toBe('2026-3-9');
  });

  it('rejects an impossible date', () => {
    expect(parseDate('45/13/2026')).toBeNull();
    expect(parseDate('hello')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('resolveType', () => {
  it('trusts the type column', () => {
    expect(resolveType('Income', -5)).toBe('income');
    expect(resolveType('Expense', 5)).toBe('expense');
    expect(resolveType('Transfer', 5)).toBe('transfer');
  });

  it('falls back to the sign when there is no type column', () => {
    expect(resolveType(undefined, 500)).toBe('income');
    expect(resolveType(undefined, -500)).toBe('expense');
  });
});

describe('buildRows', () => {
  const mapping = { date: 0, amount: 1, type: 2, category: 3, note: 4 };

  it('builds rows and stores the magnitude with a type', () => {
    const { rows, errors } = buildRows(
      [['2026-03-09', '-450', 'Expense', 'Food', 'lunch']],
      mapping
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ type: 'expense', amount: 450, category: 'Food', note: 'lunch' });
  });

  it('reports a bad row instead of dropping it silently', () => {
    const { rows, errors } = buildRows(
      [
        ['2026-03-09', '100', 'Income', '', ''],
        ['not a date', '100', 'Income', '', ''],
        ['2026-03-10', 'n/a', 'Income', '', '']
      ],
      mapping
    );
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      { line: 3, reason: 'date', value: 'not a date' },
      { line: 4, reason: 'amount', value: 'n/a' }
    ]);
  });

  it('skips a zero amount, which is usually a spacer row', () => {
    const { rows, errors } = buildRows([['2026-03-09', '0', 'Expense', '', '']], mapping);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toBe('amount');
  });

  it('tolerates a short row missing its trailing columns', () => {
    const { rows } = buildRows([['2026-03-09', '100']], mapping);
    expect(rows[0]).toMatchObject({ amount: 100, type: 'income' });
    expect(rows[0].note).toBeUndefined();
  });
});

// ── Regressions found in review ────────────────────────────────────────────

describe('detectDelimiter', () => {
  it('picks the semicolon in a European export', () => {
    // Counting all three at once split "1.234,56" into two columns.
    expect(detectDelimiter('Date;Amount;Note\n09/03/2026;1.234,56;x')).toBe(';');
  });

  it('picks the comma in a plain export', () => {
    expect(detectDelimiter('Date,Amount\n2026-03-09,100')).toBe(',');
  });

  it('ignores delimiters inside a quoted header', () => {
    expect(detectDelimiter('"Date;time",Amount\n2026-03-09,100')).toBe(',');
  });
});

describe('semicolon files', () => {
  it('keeps a comma decimal intact', () => {
    expect(parseCsv('Date;Amount\n09/03/2026;1.234,56')).toEqual([
      ['Date', 'Amount'],
      ['09/03/2026', '1.234,56']
    ]);
  });
});

describe('resolveType word matching', () => {
  it('does not read a category containing "in" as income', () => {
    // "in" matched as a substring turned Dining, Shopping, Insurance and
    // Training into income.
    for (const word of ['Dining', 'Shopping', 'Insurance', 'Training', 'Clothing']) {
      expect(resolveType(word, -100)).toBe('expense');
    }
  });

  it('still recognises a real income column', () => {
    expect(resolveType('Income', -100)).toBe('income');
    expect(resolveType('in', -100)).toBe('income');
    expect(resolveType('Credit', -100)).toBe('income');
  });
});

describe('parseDate rejects impossible days', () => {
  it('refuses 31 February rather than rolling into March', () => {
    expect(parseDate('31/02/2026', true)).toBeNull();
    expect(parseDate('2026-02-31')).toBeNull();
  });

  it('refuses 31 April but accepts 30 April', () => {
    expect(parseDate('31/04/2026', true)).toBeNull();
    expect(parseDate('30/04/2026', true)).not.toBeNull();
  });

  it('accepts 29 February in a leap year only', () => {
    expect(parseDate('29/02/2024', true)).not.toBeNull();
    expect(parseDate('29/02/2026', true)).toBeNull();
  });
});

describe('source line numbers', () => {
  it('reports the real file line despite blank rows', () => {
    const rows = parseRows('Date,Amount\n\n2026-03-09,100\n\n\nbad,50');
    const { errors } = buildRows(rows.slice(1), { date: 0, amount: 1 });
    expect(errors).toEqual([{ line: 6, reason: 'date', value: 'bad' }]);
  });

  it('counts the newlines inside a quoted field', () => {
    const rows = parseRows('Date,Note,Amount\n2026-03-09,"two\nlines",10\nbad,x,10');
    expect(rows.map((r) => r.line)).toEqual([1, 2, 4]);
  });
});
