/**
 * Budget warnings.
 *
 * `budgets.alert_80` and `budgets.alert_100` have been translated into every
 * language since the budgets screen was written, but nothing ever raised
 * them: a budget could be blown through in silence.
 *
 * An alert fires once per budget, per threshold, per budget month. Without
 * that, every transaction after the 80% mark would notify again.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { BudgetProgress } from '../db/queries/budgets';
import { ensureNotificationPermission } from './notifications';

const STORAGE_KEY = 'app_budget_alerts_fired';
const ANDROID_CHANNEL = 'reminders';

export type BudgetThreshold = 80 | 100;

export interface BudgetAlert {
  budgetId: string;
  /** null for the overall budget. */
  categoryId: string | null;
  threshold: BudgetThreshold;
  percentage: number;
}

/** A budget month, so the record resets when the next one starts. */
export function monthKeyOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function markerFor(budgetId: string, threshold: BudgetThreshold, monthKey: string): string {
  return `${monthKey}:${budgetId}:${threshold}`;
}

/**
 * Which alerts are newly due.
 *
 * Only the highest threshold a budget has crossed is returned: passing 100%
 * in one purchase should say the budget is blown, not warn that it is at 80%
 * and then immediately correct itself.
 */
export function pendingBudgetAlerts(
  progress: BudgetProgress[],
  alreadyFired: string[],
  monthKey: string
): BudgetAlert[] {
  const fired = new Set(alreadyFired);
  const alerts: BudgetAlert[] = [];

  for (const item of progress) {
    if (!item.budget.amount || item.budget.amount <= 0) continue;

    const threshold: BudgetThreshold | null =
      item.percentage >= 100 ? 100 : item.percentage >= 80 ? 80 : null;
    if (threshold === null) continue;

    if (fired.has(markerFor(item.budget.id, threshold, monthKey))) continue;

    alerts.push({
      budgetId: item.budget.id,
      categoryId: item.budget.category_id ?? null,
      threshold,
      percentage: item.percentage
    });
  }

  return alerts;
}

/**
 * Keeps the record from growing without bound.
 *
 * Only the current and previous month matter: an older marker can never
 * suppress an alert again, because the month key would not match.
 */
export function pruneMarkers(markers: string[], monthKey: string): string[] {
  const [year, month] = monthKey.split('-').map(Number);
  const previous = monthKeyOf(new Date(year, month - 2, 1));
  return markers.filter((m) => m.startsWith(`${monthKey}:`) || m.startsWith(`${previous}:`));
}

async function readMarkers(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Raises any newly due budget alerts.
 *
 * `describe` turns an alert into the notification's title and body, so this
 * module never touches translations directly.
 */
export async function runBudgetAlerts(
  progress: BudgetProgress[],
  describe: (alert: BudgetAlert) => { title: string; body: string },
  now: Date = new Date()
): Promise<BudgetAlert[]> {
  const monthKey = monthKeyOf(now);
  const markers = await readMarkers();
  const due = pendingBudgetAlerts(progress, markers, monthKey);
  if (due.length === 0) return [];

  const granted = await ensureNotificationPermission();

  for (const alert of due) {
    if (granted) {
      const { title, body } = describe(alert);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { budgetId: alert.budgetId, threshold: alert.threshold }
          },
          // Fires straight away: this is about a limit reached just now.
          trigger:
            Platform.OS === 'android'
              ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: ANDROID_CHANNEL }
              : null
        });
      } catch {
        // A blocked notification must not stop the marker being written, or
        // the same alert retries on every transaction.
      }
    }
    markers.push(markerFor(alert.budgetId, alert.threshold, monthKey));
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruneMarkers(markers, monthKey)));
  } catch {
    // Nothing to do: worst case the alert repeats next time.
  }

  return due;
}

/** Used when budgets are wiped or restored, so old markers cannot mute new ones. */
export async function resetBudgetAlerts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignored: a stale marker only delays an alert to the next month.
  }
}
