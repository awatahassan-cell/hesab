import { buildStories, buildWeekStory, buildDueStory, buildGoalStory, BuildStoriesInput } from '../stories';
import { Reminder, SavingsGoal, Transaction } from '../../db/schema';

// Thursday 24 September 2026, midday local time.
const NOW = new Date(2026, 8, 24, 12, 0);

const daysAgo = (n: number, hour = 10) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n, hour).toISOString();

let seq = 0;
const tx = (
  daysBack: number,
  amount: number,
  categoryId = 'food',
  type: Transaction['type'] = 'expense',
  currency = 'IQD'
): Transaction =>
  ({
    id: `t${seq++}`,
    type,
    amount,
    currency,
    exchange_rate: 1,
    account_id: 'a1',
    category_id: categoryId,
    category_name_key: categoryId,
    date_time: daysAgo(daysBack),
    created_at: daysAgo(daysBack)
  }) as Transaction;

const input = (over: Partial<BuildStoriesInput> = {}): BuildStoriesInput => ({
  transactions: [],
  reminders: [],
  savingsGoals: [],
  now: NOW,
  convert: (amount) => amount,
  ...over
});

describe('buildWeekStory', () => {
  it('returns nothing without any spending', () => {
    expect(buildWeekStory(input({ transactions: [tx(1, 500, 'salary', 'income')] }))).toEqual({
      week: null,
      category: null
    });
  });

  it('totals the last seven local days, today last, and compares to the week before', () => {
    const { week } = buildWeekStory(
      input({
        transactions: [tx(0, 100), tx(3, 300), tx(6, 200), tx(7, 400), tx(13, 400), tx(20, 999)]
      })
    );
    expect(week).not.toBeNull();
    expect(week!.total).toBe(600);
    expect(week!.prevTotal).toBe(800);
    expect(week!.changePct).toBe(-25);
    expect(week!.bars).toEqual([200, 0, 0, 300, 0, 0, 100]);
    expect(week!.peakIndex).toBe(3);
    expect(week!.weekdays[6]).toBe(NOW.getDay());
  });

  it('ignores income and transfers', () => {
    const { week } = buildWeekStory(
      input({ transactions: [tx(1, 100), tx(1, 5000, 'x', 'income'), tx(1, 700, 'x', 'transfer')] })
    );
    expect(week!.total).toBe(100);
  });

  it('converts every amount into the display currency', () => {
    const { week } = buildWeekStory(
      input({
        transactions: [tx(1, 10, 'food', 'expense', 'USD'), tx(2, 1000)],
        convert: (amount, currency) => (currency === 'USD' ? amount * 1500 : amount)
      })
    );
    expect(week!.total).toBe(16000);
  });

  it('does not claim a comparison when truncated history stops inside this week', () => {
    const { week, category } = buildWeekStory(
      input({ transactions: [tx(0, 100), tx(2, 50)], truncated: true })
    );
    expect(week!.prevTotal).toBeNull();
    expect(week!.changePct).toBeNull();
    expect(category!.kind).toBe('top');
  });

  it('picks the category with the biggest drop as a win', () => {
    const { category } = buildWeekStory(
      input({
        transactions: [
          tx(1, 48, 'food'),
          tx(9, 60, 'food'),
          tx(2, 10, 'fun'),
          tx(8, 40, 'fun'),
          tx(2, 300, 'rent'),
          tx(9, 300, 'rent')
        ]
      })
    );
    expect(category).toMatchObject({ kind: 'win', categoryId: 'fun', thisWeek: 10, lastWeek: 40, pct: -75 });
  });

  it('falls back to the top category and its share when nothing dropped', () => {
    const { category } = buildWeekStory(
      input({ transactions: [tx(1, 300, 'rent'), tx(2, 100, 'food'), tx(9, 50, 'food')] })
    );
    expect(category).toMatchObject({ kind: 'top', categoryId: 'rent', pct: 75 });
  });
});

describe('buildDueStory', () => {
  const reminder = (id: string, due_day: number, is_paid = 0): Reminder =>
    ({ id, title: id, amount: 200, currency: 'IQD', due_day, frequency: 'monthly', is_paid, created_at: '' }) as Reminder;

  it('picks the nearest unpaid reminder', () => {
    const story = buildDueStory(input({ reminders: [reminder('rent', 2), reminder('car', 28), reminder('gym', 25, 1)] }));
    expect(story).toMatchObject({ kind: 'due', title: 'car', diffDays: 4, amount: 200 });
  });

  it('returns nothing when every reminder is paid', () => {
    expect(buildDueStory(input({ reminders: [reminder('rent', 2, 1)] }))).toBeNull();
  });
});

describe('buildGoalStory', () => {
  const goal = (id: string, current: number, target: number, is_completed = 0): SavingsGoal =>
    ({ id, title: id, current_amount: current, target_amount: target, currency: 'IQD', color: '', icon: '', is_completed, created_at: '' }) as SavingsGoal;

  it('shows the open goal closest to done', () => {
    const story = buildGoalStory(
      input({ savingsGoals: [goal('car', 3100, 5000), goal('trip', 100, 1000), goal('done', 10, 10, 1)] })
    );
    expect(story).toMatchObject({ kind: 'goal', title: 'car', pct: 62 });
  });

  it('skips goals that are complete or have no target', () => {
    expect(buildGoalStory(input({ savingsGoals: [goal('a', 5, 0), goal('b', 10, 10)] }))).toBeNull();
  });
});

describe('buildStories', () => {
  it('is empty for a brand-new user', () => {
    expect(buildStories(input())).toEqual([]);
  });

  it('orders week, category, due, goal', () => {
    const stories = buildStories(
      input({
        transactions: [tx(1, 100)],
        reminders: [{ id: 'r', title: 'r', amount: 1, currency: 'IQD', due_day: 26, frequency: 'monthly', is_paid: 0, created_at: '' }],
        savingsGoals: [{ id: 'g', title: 'g', current_amount: 1, target_amount: 2, currency: 'IQD', color: '', icon: '', is_completed: 0, created_at: '' }]
      })
    );
    expect(stories.map((s) => s.kind)).toEqual(['week', 'top', 'due', 'goal']);
  });
});
