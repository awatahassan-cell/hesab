import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder } from '../db/schema';

/**
 * Local notifications for payment reminders.
 *
 * The reminders screen existed before this file did, which meant a person
 * could record a due date and never hear about it again. Everything here is
 * scheduled on the device — no server, no account, consistent with the app
 * keeping its data local.
 */

const ANDROID_CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

/** Asks once. Returns false when the person declined — never throws. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Payment reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250]
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Identifier prefix, so the app only ever cancels its own reminders. */
const ID_PREFIX = 'reminder:';

export async function cancelReminder(reminderId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data?.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch {
    // Nothing scheduled, or notifications unavailable on this build.
  }
}

/**
 * Schedules a monthly notification on the reminder's due day.
 *
 * Days past the end of a short month are clamped: a reminder set for the 31st
 * fires on the 28th in February rather than being skipped that month.
 */
export async function scheduleReminder(
  reminder: Pick<Reminder, 'id' | 'title' | 'due_day' | 'amount' | 'currency'>,
  body: string
): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await cancelReminder(reminder.id);

  const day = Math.min(Math.max(Math.round(reminder.due_day) || 1, 1), 28);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${reminder.id}`,
      content: {
        title: reminder.title,
        body,
        data: { reminderId: reminder.id }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day,
        hour: 9,
        minute: 0,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined
      }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-schedules everything from the current reminder list.
 *
 * Called after a restore, since restoring replaces the rows the previously
 * scheduled notifications referred to.
 */
export async function rescheduleAll(
  reminders: Reminder[],
  bodyFor: (r: Reminder) => string
): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  for (const reminder of reminders) {
    if (reminder.is_paid) continue;
    await scheduleReminder(reminder, bodyFor(reminder));
  }
}

/** Prefix for shopping-list reminders, kept apart from payment reminders. */
const SHOPPING_PREFIX = 'shopping:';

export async function cancelShoppingReminder(tripId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${SHOPPING_PREFIX}${tripId}`);
  } catch {
    // Nothing scheduled under that id.
  }
}

/**
 * Schedules a one-off reminder for a shopping list at an exact moment.
 *
 * Returns false when the time has already passed or permission was declined,
 * so the caller can say why nothing was set instead of silently doing nothing.
 */
export async function scheduleShoppingReminder(
  tripId: string,
  title: string,
  body: string,
  when: Date
): Promise<boolean> {
  if (when.getTime() <= Date.now()) return false;

  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await cancelShoppingReminder(tripId);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${SHOPPING_PREFIX}${tripId}`,
      content: { title, body, data: { tripId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined
      }
    });
    return true;
  } catch {
    return false;
  }
}
