import { StyleSheet, Text, View } from 'react-native';

import type { CategorySpend } from '../domain/subscription';

interface Props {
  data: CategorySpend[];
}

export function CategoryBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Add a subscription to see your spending breakdown.</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.monthlyTotal));

  return (
    <View>
      {data.map((d) => (
        <View key={d.category} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.category}>
              {d.category}
              <Text style={styles.subLabel}>
                {'  '}
                {d.subscriptionCount} sub{d.subscriptionCount === 1 ? '' : 's'} ·{' '}
                {d.percentage.toFixed(0)}%
              </Text>
            </Text>
            <Text style={styles.amount}>{d.monthlyTotal.toFixed(2)}/mo</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: max > 0 ? `${(d.monthlyTotal / max) * 100}%` : '0%' },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  amount: {
    fontSize: 14,
    color: '#6B7280',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#2563EB',
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
