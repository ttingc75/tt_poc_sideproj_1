import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryBarChart } from '../src/components/CategoryBarChart';
import { spendByCategory, totalMonthlySpend, totalYearlySpend } from '../src/domain/subscription';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

export default function StatsScreen() {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const categoryData = spendByCategory(subscriptions);
  const monthlyTotal = totalMonthlySpend(subscriptions);
  const yearlyTotal = totalYearlySpend(subscriptions);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>{monthlyTotal.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>per month</Text>
        </View>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>{yearlyTotal.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>per year</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Spending by category</Text>
      <CategoryBarChart data={categoryData} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
});
