import { monthKeyOf, pendingBudgetAlerts, pruneMarkers } from '../budgetAlerts';
import { BudgetProgress } from '../../db/queries/budgets';

const progress = (id: string, percentage: number, amount = 1000, categoryId?: string): BudgetProgress => ({
  budget: { id, category_id: categoryId, amount, period: 'monthly', created_at: '' } as any,
  spent: (amount * percentage) / 100,
  remaining: Math.max(0, amount - (amount * percentage) / 100),
  percentage,
  isOverBudget: percentage >= 100,
  isWarning: percentage >= 80
});

describe('pendingBudgetAlerts', () => {
  it('says nothing below 80%', () => {
    expect(pendingBudgetAlerts([progress('b1', 79)], [], '2026-09')).toEqual([]);
  });

  it('warns at exactly 80%', () => {
    expect(pendingBudgetAlerts([progress('b1', 80)], [], '2026-09')).toEqual([
      { budgetId: 'b1', categoryId: null, threshold: 80, percentage: 80 }
    ]);
  });

  it('reports only the higher threshold when a purchase blows past both', () => {
    // Warning that the budget is at 80% and then correcting to "over budget"
    // in the same breath reads as a bug.
    expect(pendingBudgetAlerts([progress('b1', 140)], [], '2026-09')).toEqual([
      { budgetId: 'b1', categoryId: null, threshold: 100, percentage: 140 }
    ]);
  });

  it('does not repeat a threshold already fired this month', () => {
    expect(pendingBudgetAlerts([progress('b1', 85)], ['2026-09:b1:80'], '2026-09')).toEqual([]);
  });

  it('still reports 100% after the 80% warning has fired', () => {
    const due = pendingBudgetAlerts([progress('b1', 101)], ['2026-09:b1:80'], '2026-09');
    expect(due).toEqual([{ budgetId: 'b1', categoryId: null, threshold: 100, percentage: 101 }]);
  });

  it('fires again in a new month', () => {
    expect(pendingBudgetAlerts([progress('b1', 85)], ['2026-08:b1:80'], '2026-09')).toHaveLength(1);
  });

  it('keeps each budget separate', () => {
    const due = pendingBudgetAlerts(
      [progress('b1', 85), progress('b2', 110, 500, 'cat_food')],
      ['2026-09:b1:80'],
      '2026-09'
    );
    expect(due).toEqual([{ budgetId: 'b2', categoryId: 'cat_food', threshold: 100, percentage: 110 }]);
  });

  it('ignores a budget with no amount, which would divide by zero', () => {
    expect(pendingBudgetAlerts([progress('b1', 0, 0)], [], '2026-09')).toEqual([]);
  });
});

describe('pruneMarkers', () => {
  it('keeps this month and last, drops older', () => {
    expect(
      pruneMarkers(['2026-09:b1:80', '2026-08:b1:80', '2026-05:b1:80', '2025-12:b2:100'], '2026-09')
    ).toEqual(['2026-09:b1:80', '2026-08:b1:80']);
  });

  it('crosses the year boundary', () => {
    expect(pruneMarkers(['2026-01:b1:80', '2025-12:b1:80', '2025-11:b1:80'], '2026-01')).toEqual([
      '2026-01:b1:80',
      '2025-12:b1:80'
    ]);
  });
});

describe('monthKeyOf', () => {
  it('pads the month', () => {
    expect(monthKeyOf(new Date(2026, 0, 31))).toBe('2026-01');
    expect(monthKeyOf(new Date(2026, 11, 1))).toBe('2026-12');
  });
});
