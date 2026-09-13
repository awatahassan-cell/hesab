import {
  fillMonths,
  localDayKey,
  localMonthKey,
  recentMonthKeys,
  runningNet,
  totalsByDay,
  totalsByMonth
} from '../aggregate';
import { Transaction } from '../../db/schema';

const tx = (type: Transaction['type'], amount: number, date_time: string): Transaction =>
  ({ id: date_time + type + amount, type, amount, currency: 'IQD', exchange_rate: 1,
     account_id: 'a1', date_time, created_at: date_time }) as Transaction;

describe('day and month keys', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Built from local parts so the test says the same thing in every zone.
    const local = new Date(2026, 2, 9, 23, 30).toISOString();
    expect(localDayKey(local)).toBe('2026-03-09');
    expect(localMonthKey(local)).toBe('2026-03');
  });

  it('pads single digit months and days', () => {
    expect(localDayKey(new Date(2026, 0, 5, 12).toISOString())).toBe('2026-01-05');
  });
});

describe('totalsByDay', () => {
  it('sums income and expense separately per day', () => {
    const rows = totalsByDay([
      tx('expense', 100, new Date(2026, 2, 9, 10).toISOString()),
      tx('expense', 50, new Date(2026, 2, 9, 18).toISOString()),
      tx('income', 900, new Date(2026, 2, 9, 9).toISOString()),
      tx('expense', 20, new Date(2026, 2, 10, 9).toISOString())
    ]);
    expect(rows).toEqual([
      { key: '2026-03-09', income: 900, expense: 150 },
      { key: '2026-03-10', income: 0, expense: 20 }
    ]);
  });

  it('ignores transfers, which move money between the user\'s own accounts', () => {
    const rows = totalsByDay([
      tx('transfer', 5000, new Date(2026, 2, 9, 10).toISOString()),
      tx('expense', 10, new Date(2026, 2, 9, 11).toISOString())
    ]);
    expect(rows).toEqual([{ key: '2026-03-09', income: 0, expense: 10 }]);
  });

  it('returns days in order', () => {
    const rows = totalsByDay([
      tx('expense', 1, new Date(2026, 2, 20, 9).toISOString()),
      tx('expense', 1, new Date(2026, 2, 3, 9).toISOString())
    ]);
    expect(rows.map((r) => r.key)).toEqual(['2026-03-03', '2026-03-20']);
  });

  it('handles an empty list', () => {
    expect(totalsByDay([])).toEqual([]);
  });
});

describe('totalsByMonth', () => {
  it('rolls days up into their month', () => {
    const rows = totalsByMonth([
      tx('expense', 100, new Date(2026, 1, 2, 9).toISOString()),
      tx('expense', 100, new Date(2026, 1, 27, 9).toISOString()),
      tx('income', 500, new Date(2026, 2, 1, 9).toISOString())
    ]);
    expect(rows).toEqual([
      { key: '2026-02', income: 0, expense: 200 },
      { key: '2026-03', income: 500, expense: 0 }
    ]);
  });
});

describe('recentMonthKeys', () => {
  it('returns the last n months, oldest first, ending at the given month', () => {
    expect(recentMonthKeys(3, new Date(2026, 2, 15))).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('crosses the year boundary', () => {
    expect(recentMonthKeys(3, new Date(2026, 0, 15))).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

describe('fillMonths', () => {
  it('inserts zeroed months so a gap shows as a gap', () => {
    const filled = fillMonths(
      [{ key: '2026-03', income: 10, expense: 4 }],
      ['2026-01', '2026-02', '2026-03']
    );
    expect(filled).toEqual([
      { key: '2026-01', income: 0, expense: 0 },
      { key: '2026-02', income: 0, expense: 0 },
      { key: '2026-03', income: 10, expense: 4 }
    ]);
  });
});

describe('runningNet', () => {
  it('accumulates income minus expense across the series', () => {
    expect(
      runningNet([
        { key: '2026-01', income: 100, expense: 40 },
        { key: '2026-02', income: 0, expense: 20 },
        { key: '2026-03', income: 50, expense: 0 }
      ])
    ).toEqual([
      { key: '2026-01', value: 60 },
      { key: '2026-02', value: 40 },
      { key: '2026-03', value: 90 }
    ]);
  });

  it('can go negative', () => {
    expect(runningNet([{ key: '2026-01', income: 0, expense: 30 }])).toEqual([
      { key: '2026-01', value: -30 }
    ]);
  });
});

describe('runningNet direction (regression)', () => {
  it('accumulates oldest to newest regardless of how the chart mirrors it', () => {
    // The trend chart reversed the series for RTL and then accumulated, which
    // gave Kurdish, Arabic, Persian and Urdu users different, wrong numbers.
    const totals = [
      { key: '2026-01', income: 100, expense: 0 },
      { key: '2026-02', income: 0, expense: 60 },
      { key: '2026-03', income: 0, expense: 10 }
    ];
    const chronological = runningNet(totals);
    expect(chronological.map((p) => p.value)).toEqual([100, 40, 30]);

    // Mirroring for display must not change any value, only their order.
    const mirrored = [...chronological].reverse();
    expect(mirrored.map((p) => p.value)).toEqual([30, 40, 100]);

    // Accumulating over the reversed input is what produced the wrong figures.
    expect(runningNet([...totals].reverse()).map((p) => p.value)).not.toEqual(mirrored.map((p) => p.value));
  });
});
