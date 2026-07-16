import { StyleSheet, Text, View } from 'react-native';

import type { RankedSubscription } from '../domain/subscription';

interface Props {
  items: RankedSubscription[];
}

export function TopSpendingList({ items }: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Add a subscription to see your biggest costs.</Text>
      </View>
    );
  }

  return (
    <View>
      {items.map(({ subscription, monthlySpend }, index) => (
        <View key={subscription.id} style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.details}>
            <Text style={styles.name}>{subscription.name}</Text>
            {subscription.category ? <Text style={styles.category}>{subscription.category}</Text> : null}
          </View>
          <Text style={styles.amount}>{monthlySpend.toFixed(2)}/mo</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rank: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  category: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
  },
});
