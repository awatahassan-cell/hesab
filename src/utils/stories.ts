import { Reminder, SavingsGoal, Transaction } from '../db/schema';
import { localDayKey } from './aggregate';

/**
 * Home-screen "stories": a few short, swipeable facts about the person's
 * own week, built only from data they already have. Each builder returns
 * nothing when there's nothing honest to say, so a new user sees no stories
 * rather than a row of zeros.
 */

export interface WeekStory {
  kind: 'week';
  /** Expense total for the last seven days, today included. */
  total: number;
  /** The seven days before that, or null when the loaded history doesn't
   *  reach back far enough to know. */
  prevTotal: number | null;
  /** Percent change against prevTotal; negative means less spending. */
  changePct: number | null;
  /** Daily expense totals, oldest first — the last entry is today. */
  bars: number[];
  /** Day-of-week (0 = Sunday) for each bar. */
  weekdays: number[];
  /** Index into bars of the heaviest day. */
  peakIndex: number;
}

export interface CategoryStory {
  /** 'win' — a category that fell noticeably against last week.
   *  'top' — no such win, so the week's biggest category instead. */
  kind: 'win' | 'top';
  categoryId: string;
  nameKey?: string;
  customName?: string;
  color?: string;
  thisWeek: number;
  lastWeek: number;
  /** 'win': percent change (negative). 'top': share of the week's spending. */
  pct: number;
}

export interface DueStory {
  kind: 'due';
  title: string;
  amount: number;
  /** Days until due_day this month; negative once it has passed unpaid. */
  diffDays: number;
  dueDay: number;
}

export interface GoalStory {
  kind: 'goal';
  title: string;
  current: number;
  target: number;
  currency: string;
  pct: number;
}

export type Story = WeekStory | CategoryStory | DueStory | GoalStory;

export interface BuildStoriesInput {
  transactions: Transaction[];
  reminders: Reminder[];
  savingsGoals: SavingsGoal[];
  now: Date;
  /** Converts an amount in its own currency into the display currency. */
  convert: (amount: number, currency: string | undefined) => number;
  /** True when `transactions` was cut off by a query limit, so older days
   *  may be missing from it. */
  truncated?: boolean;
}

/** A category has to fall by at least this much to count as a win. */
const WIN_THRESHOLD_PCT = 10;

function dayKeyOf(date: Date): string {
  return localDayKey(date.toISOString());
}

/** Local midnight `days` days before `now`'s own local midnight. */
function startOfDayOffset(now: Date, days: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - days);
  return d;
}

function pctChange(current: number, previous: number): number {
  return Math.round(((current - previous) / previous) * 100);
}

export function buildWeekStory(input: BuildStoriesInput): {
  week: WeekStory | null;
  category: CategoryStory | null;
} {
  const { transactions, now, convert, truncated } = input;

  // Fourteen local days, oldest first: 0–6 last week, 7–13 this week.
  const keys: string[] = [];
  const weekdays: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = startOfDayOffset(now, i);
    keys.push(dayKeyOf(d));
    weekdays.push(d.getDay());
  }
  const indexOfKey = new Map(keys.map((k, i) => [k, i]));
  const daily = new Array(14).fill(0);

  const catThis = new Map<string, number>();
  const catLast = new Map<string, number>();
  const catMeta = new Map<string, Pick<CategoryStory, 'nameKey' | 'customName' | 'color'>>();

  const prevStart = startOfDayOffset(now, 13).getTime();
  let reachesPrev = !truncated;

  for (const tx of transactions) {
    const time = new Date(tx.date_time).getTime();
    if (time < prevStart) reachesPrev = true;
    if (tx.type !== 'expense') continue;
    const idx = indexOfKey.get(localDayKey(tx.date_time));
    if (idx === undefined) continue;
    const amount = convert(tx.amount, tx.currency);
    daily[idx] += amount;

    const catId = tx.category_id || 'other';
    const bucket = idx >= 7 ? catThis : catLast;
    bucket.set(catId, (bucket.get(catId) || 0) + amount);
    if (!catMeta.has(catId)) {
      catMeta.set(catId, {
        nameKey: tx.category_name_key,
        customName: tx.category_custom_name,
        color: tx.category_color
      });
    }
  }

  const bars = daily.slice(7);
  const total = bars.reduce((a, b) => a + b, 0);
  const prevRaw = daily.slice(0, 7).reduce((a, b) => a + b, 0);
  const prevTotal = reachesPrev ? prevRaw : null;

  if (total <= 0 && !(prevTotal && prevTotal > 0)) {
    return { week: null, category: null };
  }

  let peakIndex = 0;
  bars.forEach((v, i) => {
    if (v > bars[peakIndex]) peakIndex = i;
  });

  const week: WeekStory = {
    kind: 'week',
    total,
    prevTotal,
    changePct: prevTotal && prevTotal > 0 ? pctChange(total, prevTotal) : null,
    bars,
    weekdays: weekdays.slice(7),
    peakIndex
  };

  // A win needs a real comparison, so only look for one when last week is known.
  let category: CategoryStory | null = null;
  if (reachesPrev) {
    for (const [catId, last] of catLast) {
      if (last <= 0) continue;
      const current = catThis.get(catId) || 0;
      const pct = pctChange(current, last);
      if (pct > -WIN_THRESHOLD_PCT) continue;
      // The biggest absolute saving is the one worth telling.
      if (!category || last - current > category.lastWeek - category.thisWeek) {
        category = { kind: 'win', categoryId: catId, ...catMeta.get(catId), thisWeek: current, lastWeek: last, pct };
      }
    }
  }

  if (!category && total > 0) {
    let topId: string | null = null;
    let amount = 0;
    for (const [id, v] of catThis) {
      if (v > amount) {
        topId = id;
        amount = v;
      }
    }
    if (topId !== null) {
      category = {
        kind: 'top',
        categoryId: topId,
        ...catMeta.get(topId),
        thisWeek: amount,
        lastWeek: catLast.get(topId) || 0,
        pct: Math.round((amount / total) * 100)
      };
    }
  }

  return { week, category };
}

export function buildDueStory(input: BuildStoriesInput): DueStory | null {
  const unpaid = (input.reminders || []).filter((r) => !r.is_paid);
  if (unpaid.length === 0) return null;
  const today = input.now.getDate();
  // Same ordering as the upcoming-bill banner, so the two never disagree
  // about which bill is "next".
  const next = [...unpaid].sort(
    (a, b) => ((a.due_day - today + 31) % 31) - ((b.due_day - today + 31) % 31)
  )[0];
  return {
    kind: 'due',
    title: next.title,
    amount: input.convert(next.amount, next.currency),
    diffDays: next.due_day - today,
    dueDay: next.due_day
  };
}

export function buildGoalStory(input: BuildStoriesInput): GoalStory | null {
  const open = (input.savingsGoals || []).filter(
    (g) => !g.is_completed && g.target_amount > 0 && g.current_amount < g.target_amount
  );
  if (open.length === 0) return null;
  // The goal closest to done is the most encouraging one to show.
  const best = open.reduce((a, b) =>
    b.current_amount / b.target_amount > a.current_amount / a.target_amount ? b : a
  );
  return {
    kind: 'goal',
    title: best.title,
    current: best.current_amount,
    target: best.target_amount,
    currency: best.currency,
    pct: Math.max(0, Math.min(99, Math.floor((best.current_amount / best.target_amount) * 100)))
  };
}

export function buildStories(input: BuildStoriesInput): Story[] {
  const { week, category } = buildWeekStory(input);
  const stories: (Story | null)[] = [week, category, buildDueStory(input), buildGoalStory(input)];
  return stories.filter((s): s is Story => s !== null);
}
