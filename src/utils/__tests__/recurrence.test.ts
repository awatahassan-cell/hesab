import { addStep, dueOccurrences, isFrequency, MAX_CATCH_UP } from '../recurrence';

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h, 0, 0, 0);
const iso = (d: Date) => d.toISOString();

describe('addStep', () => {
  it('advances days and weeks', () => {
    expect(addStep(at(2026, 3, 9), 'daily')).toEqual(at(2026, 3, 10));
    expect(addStep(at(2026, 3, 9), 'weekly')).toEqual(at(2026, 3, 16));
    expect(addStep(at(2026, 3, 9), 'daily', 3)).toEqual(at(2026, 3, 12));
  });

  it('advances months and years', () => {
    expect(addStep(at(2026, 3, 9), 'monthly')).toEqual(at(2026, 4, 9));
    expect(addStep(at(2026, 3, 9), 'yearly')).toEqual(at(2027, 3, 9));
  });

  it('crosses the year boundary', () => {
    expect(addStep(at(2026, 12, 15), 'monthly')).toEqual(at(2027, 1, 15));
  });

  it('clamps the 31st into a short month', () => {
    expect(addStep(at(2026, 1, 31), 'monthly')).toEqual(at(2026, 2, 28));
  });

  it('returns to the anchor day after a clamped month', () => {
    // Advancing from the clamped date would walk a rent day backwards to the
    // 28th and leave it there.
    const anchor = 31;
    const february = addStep(at(2026, 1, 31), 'monthly', 1, anchor);
    expect(february).toEqual(at(2026, 2, 28));
    expect(addStep(february, 'monthly', 1, anchor)).toEqual(at(2026, 3, 31));
  });

  it('handles 29 February on a yearly rule', () => {
    expect(addStep(at(2024, 2, 29), 'yearly', 1, 29)).toEqual(at(2025, 2, 28));
  });

  it('treats a zero or negative interval as one step', () => {
    expect(addStep(at(2026, 3, 9), 'daily', 0)).toEqual(at(2026, 3, 10));
    expect(addStep(at(2026, 3, 9), 'daily', -5)).toEqual(at(2026, 3, 10));
  });
});

describe('dueOccurrences', () => {
  const rule = (next: Date, frequency: any = 'monthly', extra: any = {}) => ({
    frequency,
    next_run: iso(next),
    start_date: iso(next),
    ...extra
  });

  it('posts nothing for a rule that is not due yet', () => {
    const result = dueOccurrences(rule(at(2026, 4, 1)), at(2026, 3, 9));
    expect(result.dates).toEqual([]);
    expect(result.nextRun).toEqual(at(2026, 4, 1));
  });

  it('posts an occurrence due today', () => {
    const result = dueOccurrences(rule(at(2026, 3, 9, 8)), at(2026, 3, 9, 10));
    expect(result.dates).toHaveLength(1);
    expect(result.nextRun).toEqual(at(2026, 4, 9, 8));
  });

  it('catches up on every occurrence missed while the app was closed', () => {
    const result = dueOccurrences(rule(at(2026, 1, 5), 'monthly'), at(2026, 4, 20));
    expect(result.dates.map((d) => d.getMonth() + 1)).toEqual([1, 2, 3, 4]);
    expect(result.nextRun).toEqual(at(2026, 5, 5));
  });

  it('caps a long backlog and resumes from now rather than replaying it', () => {
    const result = dueOccurrences(rule(at(2024, 1, 1), 'daily'), at(2026, 3, 9));
    expect(result.dates).toHaveLength(MAX_CATCH_UP);
    expect(result.truncated).toBe(true);
    // The skipped backlog must not come back on the next launch.
    expect(result.nextRun.getTime()).toBeGreaterThan(at(2026, 3, 9).getTime());
  });

  it('stops at the end date', () => {
    const result = dueOccurrences(
      rule(at(2026, 1, 5), 'monthly', { end_date: iso(at(2026, 2, 28)) }),
      at(2026, 6, 1)
    );
    expect(result.dates.map((d) => d.getMonth() + 1)).toEqual([1, 2]);
    expect(result.finished).toBe(true);
  });

  it('keeps the anchor day across a short month while catching up', () => {
    const result = dueOccurrences(rule(at(2026, 1, 31), 'monthly'), at(2026, 3, 31, 23));
    expect(result.dates.map((d) => `${d.getMonth() + 1}-${d.getDate()}`)).toEqual([
      '1-31',
      '2-28',
      '3-31'
    ]);
  });

  it('gives up on a malformed date instead of looping forever', () => {
    const result = dueOccurrences(
      { frequency: 'daily', next_run: 'not-a-date', start_date: 'not-a-date' },
      at(2026, 3, 9)
    );
    expect(result.dates).toEqual([]);
    expect(result.finished).toBe(true);
  });
});

describe('isFrequency', () => {
  it('accepts the four the app offers and rejects anything else', () => {
    expect(isFrequency('monthly')).toBe(true);
    expect(isFrequency('fortnightly')).toBe(false);
  });
});
