import {
  format,
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addDays
} from 'date-fns';

import { getNumberLocale } from './currency';

export type DatePeriod = 'day' | 'week' | 'month' | 'year' | 'custom';

export function getPeriodRange(
  period: DatePeriod,
  referenceDate: Date = new Date(),
  monthStartDay: number = 1
): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return {
        start: startOfDay(referenceDate),
        end: endOfDay(referenceDate)
      };

    case 'week':
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 6 }), // Saturday in Middle East
        end: endOfWeek(referenceDate, { weekStartsOn: 6 })
      };

    case 'month': {
      if (monthStartDay === 1) {
        return {
          start: startOfMonth(referenceDate),
          end: endOfMonth(referenceDate)
        };
      }
      // Custom month start day (e.g. 15th)
      const currentDay = referenceDate.getDate();
      let start: Date;
      let end: Date;

      if (currentDay >= monthStartDay) {
        start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), monthStartDay, 0, 0, 0);
        const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, monthStartDay, 23, 59, 59);
        end = addDays(nextMonth, -1);
      } else {
        const prevMonth = subMonths(referenceDate, 1);
        start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), monthStartDay, 0, 0, 0);
        end = addDays(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), monthStartDay, 23, 59, 59), -1);
      }
      return { start, end };
    }

    case 'year':
      return {
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate)
      };

    case 'custom':
    default:
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate)
      };
  }
}

export function formatTransactionDate(dateIso: string, localeLabels?: { today: string; yesterday: string }): string {
  const date = new Date(dateIso);
  if (isToday(date)) {
    return localeLabels?.today || 'Today';
  }
  if (isYesterday(date)) {
    return localeLabels?.yesterday || 'Yesterday';
  }
  return format(date, 'yyyy/MM/dd');
}

export function formatTime(dateIso: string): string {
  return format(new Date(dateIso), 'hh:mm a');
}

export const KURDISH_MONTHS = [
  'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
  'تەمووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'
];

export function getKurdishFormattedDate(date: Date = new Date()): string {
  const day = date.getDate();
  const monthName = KURDISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day}ی ${monthName} ${year}`;
}

/**
 * A date the user reads, in their own language.
 *
 * JavaScript has no Kurdish locale, so Kurdish uses the app's own month names
 * rather than falling back to an English date inside a Kurdish screen. Every
 * other language goes through Intl with the locale the number formatter is
 * already using, so a Turkish or Russian user does not get English dates.
 */
export function formatLocalDate(date: Date, language: string): string {
  if (language === 'ku') return getKurdishFormattedDate(date);
  return date.toLocaleDateString(getNumberLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/** A 24-hour clock time in the user's locale. */
export function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString(getNumberLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
