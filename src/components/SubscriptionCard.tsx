import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysUntil, type Subscription } from '../domain/subscription';

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

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.name}>{subscription.name}</Text>
        <Text style={[styles.due, urgent && styles.dueUrgent]}>{dueLabel(days)}</Text>
      </View>
      <Text style={styles.amount}>
        {subscription.amount} {subscription.currency}
        <Text style={styles.cycle}> / {subscription.cycle}</Text>
      </Text>
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
});
