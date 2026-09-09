/**
 * When a repeating transaction is next due.
 *
 * Pure date arithmetic, kept apart from the database so the awkward cases —
 * the 31st in February, a phone that was off for three weeks — can be tested
 * directly rather than inferred from what ended up in the table.
 */

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as string[]).includes(value);
}

/**
 * Advances one step.
 *
 * Monthly and yearly keep the day of the month from the original start date
 * and clamp it to the length of the target month, so a rule set for the 31st
 * posts on the 28th in February and returns to the 31st in March. Advancing
 * from the clamped date instead would walk the rule backwards to the 28th
 * permanently.
 */
export function addStep(from: Date, frequency: Frequency, interval = 1, anchorDay?: number): Date {
  const step = Math.max(1, Math.round(interval));
  const next = new Date(from.getTime());

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + step);
      return next;

    case 'weekly':
      next.setDate(next.getDate() + step * 7);
      return next;

    case 'monthly': {
      const day = anchorDay ?? from.getDate();
      const target = new Date(from.getFullYear(), from.getMonth() + step, 1, from.getHours(), from.getMinutes());
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(day, lastDay));
      return target;
    }

    case 'yearly': {
      const day = anchorDay ?? from.getDate();
      const target = new Date(from.getFullYear() + step, from.getMonth(), 1, from.getHours(), from.getMinutes());
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(day, lastDay));
      return target;
    }
  }
}

/**
 * A cap on how many transactions one rule may post in a single catch-up.
 *
 * A daily rule left alone for two years should not silently write seven
 * hundred rows the moment the app is opened.
 */
export const MAX_CATCH_UP = 60;

export interface DueResult {
  /** Occurrences to post, oldest first. */
  dates: Date[];
  /** Where the rule stands after posting them. */
  nextRun: Date;
  /** True when the cap stopped it short and more were skipped. */
  truncated: boolean;
  /** True once the rule has passed its end date and should stop. */
  finished: boolean;
}

/**
 * Every occurrence due at `now`, and where the rule lands afterwards.
 *
 * Occurrences that fall on or before `now` are posted; the first one after it
 * becomes the next run. A rule created today for next month therefore posts
 * nothing today, which is what someone setting up rent expects.
 */
export function dueOccurrences(
  rule: {
    frequency: Frequency;
    interval_count?: number;
    next_run: string;
    end_date?: string | null;
    start_date: string;
  },
  now: Date = new Date()
): DueResult {
  const interval = Math.max(1, Math.round(rule.interval_count ?? 1));
  const anchorDay = new Date(rule.start_date).getDate();
  const end = rule.end_date ? new Date(rule.end_date) : null;

  let cursor = new Date(rule.next_run);
  const dates: Date[] = [];
  let truncated = false;

  // A malformed date would otherwise loop forever.
  if (Number.isNaN(cursor.getTime())) {
    return { dates: [], nextRun: now, truncated: false, finished: true };
  }

  while (cursor.getTime() <= now.getTime()) {
    if (end && cursor.getTime() > end.getTime()) break;
    if (dates.length >= MAX_CATCH_UP) {
      truncated = true;
      break;
    }
    dates.push(new Date(cursor.getTime()));
    cursor = addStep(cursor, rule.frequency, interval, anchorDay);
  }

  // Skip the backlog that the cap refused, so the rule resumes from now
  // instead of posting the same overflow again on the next launch.
  if (truncated) {
    while (cursor.getTime() <= now.getTime()) {
      if (end && cursor.getTime() > end.getTime()) break;
      cursor = addStep(cursor, rule.frequency, interval, anchorDay);
    }
  }

  const finished = !!end && cursor.getTime() > end.getTime();
  return { dates, nextRun: cursor, truncated, finished };
}

/** The first run of a brand new rule: the start date itself. */
export function firstRun(startDate: Date): Date {
  return new Date(startDate.getTime());
}
