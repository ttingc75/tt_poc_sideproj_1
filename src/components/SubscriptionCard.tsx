import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysUntil, yourShare, type Subscription } from '../domain/subscription';

interface Props {
  subscription: Subscription;
  onPress: () => void;
}

function dueLabel(days: number): string {
  if (days < 0) return 'overdue';
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

export function SubscriptionCard({ subscription, onPress }: Props) {
  const days = daysUntil(subscription.nextBillingDate);
  const urgent = days <= 3;
  const isShared = subscription.splitCount > 1;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.name}>{subscription.name}</Text>
        <Text style={[styles.due, urgent && styles.dueUrgent]}>{dueLabel(days)}</Text>
        {isShared && (
          <Text style={styles.shared}>split {subscription.splitCount} ways</Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>
          {isShared ? yourShare(subscription).toFixed(2) : subscription.amount}{' '}
          {subscription.currency}
          <Text style={styles.cycle}> / {subscription.cycle}</Text>
        </Text>
        {isShared && (
          <Text style={styles.fullAmount}>
            {subscription.amount} {subscription.currency} total
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  left: {
    flexShrink: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  due: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dueUrgent: {
    color: '#DC2626',
    fontWeight: '600',
  },
  shared: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cycle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  fullAmount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
