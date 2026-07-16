import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryBarChart } from '../src/components/CategoryBarChart';
import { SpendTrendChart } from '../src/components/SpendTrendChart';
import { TopSpendingList } from '../src/components/TopSpendingList';
import {
  buildMonthlySpendTrend,
  spendByCategory,
  topSpendingSubscriptions,
  totalMonthlySpend,
  totalYearlySpend,
} from '../src/domain/subscription';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

const TREND_MONTHS = 6;
const TOP_N = 5;

export default function StatsScreen() {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const spendEvents = useSubscriptionStore((s) => s.spendEvents);

  const categoryData = spendByCategory(subscriptions);
  const monthlyTotal = totalMonthlySpend(subscriptions);
  const yearlyTotal = totalYearlySpend(subscriptions);
  const trendPoints = buildMonthlySpendTrend(spendEvents, TREND_MONTHS);
  const topSpenders = topSpendingSubscriptions(subscriptions, TOP_N);

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

      <Text style={styles.sectionTitle}>Spending trend (last {TREND_MONTHS} months)</Text>
      <SpendTrendChart points={trendPoints} />

      <Text style={styles.sectionTitle}>Top {TOP_N} subscriptions</Text>
      <TopSpendingList items={topSpenders} />

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
    marginTop: 24,
    marginBottom: 16,
  },
});
