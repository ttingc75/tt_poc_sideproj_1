import * as Notifications from 'expo-notifications';

import type { Subscription } from '../domain/subscription';

export const REMINDER_DAYS_BEFORE = 2;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function reminderIdentifier(subscriptionId: number): string {
  return `subscription-reminder-${subscriptionId}`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

/** Schedules a local reminder N days before the subscription's next billing date. No-ops if that date has already passed. */
export async function scheduleReminder(
  subscription: Pick<Subscription, 'id' | 'name' | 'amount' | 'currency' | 'nextBillingDate'>
): Promise<void> {
  const triggerDate = new Date(`${subscription.nextBillingDate}T09:00:00`);
  triggerDate.setDate(triggerDate.getDate() - REMINDER_DAYS_BEFORE);

  if (triggerDate.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier(subscription.id),
    content: {
      title: `${subscription.name} renews soon`,
      body: `${subscription.amount} ${subscription.currency} will be charged on ${subscription.nextBillingDate}.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelReminder(subscriptionId: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(subscriptionId));
}
